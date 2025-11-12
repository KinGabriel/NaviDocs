import Document from '../models/documentModel.js';
import SubmissionBin from '../models/submissionBinModel.js';
import axios from 'axios';
import FormData from 'form-data';
import path from 'path';
import { createVersionData } from './documentVersionController.js';
import { escapeHtml, buildDocumentHtml, pagesJsonToHtml, generatePdfBuffer, uploadPdfToStorage, uploadPdfBuffer } from '../utils/pdfExportUtil.js';
import { buildUserServiceHeaders, fetchUserInfoById } from '../utils/userServiceUtils.js';
import { hasRole } from '../utils/roleUtils.js';

// Notification Helper
const NOTIF_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8008';
const INTERNAL_HEADERS = { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_TOKEN || '' };

const safeNameFromUser = (u) => {
  if (!u) return 'Someone';
  return (
    u.name ||
    u.fullname ||
    [u.firstName || u.firstname, u.lastName || u.lastname].filter(Boolean).join(' ').trim() ||
    u.email ||
    'Someone'
  );
};
const safeRoleFromUser = (u) => {
  if (!u) return 'User';
  if (typeof u.role === 'string') return u.role;
  if (u.role && u.role.name) return u.role.name;
  return 'User';
};

const postNotification = async (payload) => {
  try {
    await axios.post(`${NOTIF_URL}/api/notifications/internal`, payload, {
      headers: INTERNAL_HEADERS,
      timeout: 5000,
    });
  } catch (e) {
    console.error('Notification post failed', e?.response?.status || e?.message || e);
  }
};

// New helper with callback pattern
const postNotificationWithCallback = async (payload, cb) => {
  let resp = null;
  let err = null;
  try {
    resp = await axios.post(`${NOTIF_URL}/api/notifications/internal`, payload, {
      headers: INTERNAL_HEADERS,
      timeout: 5000,
    });
  } catch (e) {
    err = e;
    console.error('Notification post failed', e?.response?.status || e?.message || e);
  }
  if (typeof cb === 'function') {
    try {
      await cb(err, resp);
    } catch (cbErr) {
      console.error('Notification callback error', cbErr?.message || cbErr);
    }
  }
  return { err, resp };
};

/**
 * @route POST /api/documents/:id/share
 * @desc Share a document with external emails or other userIds. This only records the share action on the document as a note.
 */
export const shareDocument = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ message: 'id required' });

		const { assignees } = req.body;
		if (!Array.isArray(assignees)) {
			return res.status(400).json({ message: 'assignees array required (can be empty to clear)'});
		}

		const doc = await Document.findById(id);
		if (!doc) return res.status(404).json({ message: 'document not found' });

		// Normalize assignees into objects: { userId: String, access: 'viewer'|'editor' }
		// Accept either string userId or object { userId, access }
		const normalize = (entry) => {
			if (!entry) return null;
			if (typeof entry === 'string' || typeof entry === 'number') {
				return { userId: String(entry), access: 'viewer' };
			}
			if (typeof entry === 'object') {
				const userId = entry.userId || entry.id || entry._id || entry.user || null;
				const access = (entry.access === 'editor') ? 'editor' : 'viewer';
				if (!userId) return null;
				return { userId: String(userId), access };
			}
			return null;
		};

		const normalized = assignees.map(normalize).filter(Boolean);

		// Validate: if any entries were dropped by normalization, return 400 with details
		const invalids = assignees.map((a, i) => ({ raw: a, normalized: normalize(a) })).filter(x => !x.normalized);
		if (invalids.length) {
			return res.status(400).json({ message: 'Some assignees were invalid', invalids });
		}

		// dedupe by userId (preserve first occurrence)
		const seen = new Set();
		const deduped = [];
		for (const a of normalized) {
			if (!a || !a.userId) continue;
			if (seen.has(a.userId)) continue;
			seen.add(a.userId);
			deduped.push(a);
		}

		// Replace assigned array entirely with normalized objects
		doc.assigned = deduped;

		// Keep the from_template.assigned snapshot in sync if present (best-effort)
		// Note: intentionally do not modify doc.from_template.assigned (template snapshot) — keep snapshot immutable


		// Add an audit note for share action
		try {
			const actor = req.user?.id || null;
			const note = { action: 'share', by: actor, assignees: deduped.map(a => a.userId), at: new Date() };
			doc.notes = Array.isArray(doc.notes) ? [note, ...doc.notes] : [note];
		} catch (e) {
			console.warn('Failed to append share note', e?.message || e);
		}

		// Try to save. If the model's schema still expects legacy ObjectId/string array for `assigned`,
		try {
			await doc.save();
		} catch (saveErr) {
			console.warn('Initial doc.save failed, attempting legacy save with userId array', saveErr?.message || saveErr);
			try {
				// fallback: write legacy array of userId strings
				doc.assigned = deduped.map(a => a.userId);
				await doc.save();
			} catch (fallbackErr) {
				console.error('Fallback save also failed', fallbackErr);
				return res.status(500).json({ message: 'Failed to share document', error: fallbackErr.message || String(fallbackErr) });
			}
		}

		// Notification with callback
		try {
		const actorName = safeNameFromUser(req.user);
		const message = `${actorName} shared a document with you.`;
		const targetedUserIds = deduped.map(a => a.userId).filter(Boolean);
		if (targetedUserIds.length) {
			await postNotificationWithCallback(
			{
				type: 'document_shared',
				message,
				link: `/documents/editable-fields/${doc._id}`,
				targetedUserIds,
			},
			(err) => {
				if (err) {
				console.warn('shareDocument notification callback: failure recorded');
				}
			}
			);
		}
		} catch (e) {
		console.error('shareDocument notification error', e?.message || e);
		}

		return res.json({ success: true, message: 'Document shared successfully', document: doc, assignedIds: deduped.map(a => a.userId) });
	} catch (err) {
		console.error('shareDocument error', err);
		return res.status(500).json({ message: 'Failed to share document', error: err.message });
	}
};

/**
 * Create a new Submission Bin
 *
 * @route POST /api/submission-bins
 * @desc Department Head creates a submission bin with allowed templates, assigned faculty, deadline, and bin-wide instructions.
 * @param {import('express').Request} req Express request (expects authenticated req.user)
 * @param {import('express').Response} res Express response
 * @returns {Promise<void>} 201 with created bin, or error status
 */
export const createSubmissionBin = async (req, res) => {
	try {
		if (!hasRole(req, ['Department Head'])) {
			return res.status(403).json({ message: 'Only Department Head can create bins' });
		}

		const {
			title,
			instructions = '',
			department = null,
			school = req.user?.school || '',
			route_to = null,
			deadline = null,
			template_ids = [],
			faculty_ids = [],
			submissions = [],
			target_scope: targetScopeRaw = undefined,
		} = req.body || {};

		const actorId = req.user?._id || req.user?.id || null;
		const target_scope = (targetScopeRaw || req.body?.scope || 'department');
		const bin = await SubmissionBin.create({
			title,
			instructions,
			department,
			school,
			created_by: actorId,
			route_to,
			deadline,
			template_ids,
			faculty_ids,
			target_scope,
			submissions: (submissions || []).map(s => ({
				documents: Array.isArray(s.documents) ? s.documents : [],
				template: s.template,
				faculty: s.faculty,
				instructions: s.instructions || '',
				status: s.status || 'assigned',
			})),
		});

		// --- NEW: Notify faculty of assignments (per submission) ---
		try {
			const actorName = safeNameFromUser(req.user);
			const deadlineTxt = bin.deadline ? new Date(bin.deadline).toLocaleString() : 'No deadline';
			const items = Array.isArray(bin.submissions) ? bin.submissions : [];

			// Fetch template titles in bulk (best-effort) to include human-friendly names in notifications
			const templateServiceUrl = process.env.TEMPLATE_SERVICE_URL || 'http://localhost:8002';
			const headers = {};
			const context = req.context || {};
			if (context.token) {
				headers['Cookie'] = `token=${context.token}`;
			} else if (req.cookies && req.cookies.token) {
				headers['Cookie'] = `token=${req.cookies.token}`;
			}

			const uniqueTemplateIds = Array.from(new Set(items.map(s => s && s.template ? String(s.template) : '').filter(Boolean)));
			const templateTitleMap = {};
			await Promise.all(uniqueTemplateIds.map(async (tid) => {
				try {
					const resp = await axios.get(`${templateServiceUrl}/api/templates/${tid}`, { headers, withCredentials: true });
					const tpl = resp?.data?.template || resp?.data || null;
					if (tpl) templateTitleMap[String(tid)] = tpl.title || tpl.name || String(tid);
				} catch (_) {
					// ignore per-template failures
					templateTitleMap[String(tid)] = String(tid);
				}
			}));

			for (const s of items) {
				const facultyId = s.faculty ? String(s.faculty) : null;
				if (!facultyId) continue;
				const templateId = s.template ? String(s.template) : '';
				const templateName = (templateId && templateTitleMap[templateId]) ? templateTitleMap[templateId] : templateId || 'a template';
				const message = `You have been assigned to submit "${templateName}" in submission bin "${bin.title}". Deadline: ${deadlineTxt}. Assigned by ${actorName}.`;
				await postNotificationWithCallback(
					{
						type: 'submission_bin_assignment',
						message,
						link: `/faculty/document-workflow/${bin._id}`,
						targetedUserIds: [facultyId],
						recipientUser: facultyId,
					},
					(err) => {
						if (err) console.warn('createSubmissionBin notify (faculty) failed for', facultyId);
					}
				);
			}
		} catch (e) {
			console.error('createSubmissionBin notification error', e?.message || e);
		}

		return res.status(201).json(bin);
	} catch (err) {
		console.error('createSubmissionBin error', err);
		return res.status(500).json({ message: 'Failed to create submission bin', error: err.message });
	}
};

/**
 * List Submission Bins
 *
 * @route GET /api/submission-bins
 * @desc List bins with optional filters: department, status, mine=true (created_by current user)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const listBins = async (req, res) => {
	try {
		const { department, status, mine } = req.query;
		const filter = {};
		if (department) filter.department = department;
		if (status) filter.status = status;
		if (mine === 'true') filter.created_by = (req.user?._id || req.user?.id);

		// Restrict dean/secretary views to forwarded bins in their school (role-agnostic)
		if (hasRole(req, ['Dean']) || hasRole(req, ['Secretary'])) {
			if (req.user?.school) filter.school = req.user.school;
			filter.is_forwarded = true;
		}

		const bins = await SubmissionBin.find(filter).sort({ createdAt: -1 });
		console.log('listBins', { filter, count: bins.length });
		return res.json(bins);
	} catch (err) {
		console.error('listBins error', err);
		return res.status(500).json({ message: 'Failed to list bins', error: err.message });
	}
};

/**
 * List Submission Bins that reference a given document in any submission item
 *
 * @route GET /api/submission-bins/by-document/:documentId
 * @desc Applies the same visibility rules: dean/secretary only see forwarded bins in their school
 */
export const listBinsByDocument = async (req, res) => {
	try {
		const { documentId } = req.params;
		if (!documentId) return res.status(400).json({ message: 'documentId required' });

		const filter = { 'submissions.documents': documentId };
		if (hasRole(req, ['dean']) || hasRole(req, ['secretary'])) {
			if (req.user?.school) filter.school = req.user.school;
			filter.is_forwarded = true;
		}

		const bins = await SubmissionBin.find(filter).sort({ createdAt: -1 });
		return res.json(bins);
	} catch (err) {
		console.error('listBinsByDocument error', err);
		return res.status(500).json({ message: 'Failed to list bins by document', error: err.message });
	}
};

/**
 * Get a specific Submission item by a contained document id
 *
 * @route GET /api/documents/submission-bins/:binId/document/:documentId
 * @desc Uses the provided submission bin id to authorize and return the document content
 */
export const getDocumentContent = async (req, res) => {
	try {
		const { documentId, binId } = req.params;
		if (!documentId) return res.status(400).json({ message: 'documentId required' });
		if (!binId) return res.status(400).json({ message: 'binId required' });

		// Load the bin by id (caller-supplied context). Use this bin as source of truth for forwarding state.
		const bin = await SubmissionBin.findById(binId);
		if (!bin) return res.status(404).json({ message: 'Submission bin not found' });

		// Find the specific submission item that contains the document inside this bin
		const obj = bin.toObject ? bin.toObject() : JSON.parse(JSON.stringify(bin));
		const submissions = Array.isArray(obj.submissions) ? obj.submissions : [];
		let matched = null;
		for (const s of submissions) {
			if (Array.isArray(s.documents) && s.documents.map(String).includes(String(documentId))) {
				matched = s;
				break;
			}
			// also allow legacy single 'document' field
			if (s.document && String(s.document._id || s.document.id || s.document) === String(documentId)) {
				matched = s;
				break;
			}
		}
		if (!matched) return res.status(404).json({ message: 'Submission item for document not found in the provided bin' });

		// Authorization: allow bin owner, submission faculty, Department Head.
		// For Dean/Secretary allow only when bin.is_forwarded === true (main basis per requirement).
		try {
			const actorId = String(req.user?._id || req.user?.id || '');
			const isBinOwner = actorId && String(bin.created_by || '') === actorId;
			const isSubmissionFaculty = actorId && String(matched.faculty || '') === actorId;
			const isDeptHead = hasRole(req, ['Department Head']);
			const isDeanOrSecretary = hasRole(req, ['Dean']) || hasRole(req, ['Secretary']) || hasRole(req, ['dean']) || hasRole(req, ['secretary']);

			if (!isBinOwner && !isSubmissionFaculty && !isDeptHead && !isDeanOrSecretary) {
				return res.status(403).json({ message: 'Not authorized to access this document' });
			}

			if (isDeanOrSecretary) {
				// main basis: only require the bin to be forwarded
				if (!bin.is_forwarded) {
					return res.status(403).json({ message: 'Not authorized to access this document' });
				}
			}
		} catch (authErr) {
			console.error('Authorization check failed for getDocumentContent', authErr);
			return res.status(500).json({ message: 'Authorization check failed' });
		}

		// Fetch the exact document content
		let documentObj = null;
		try {
			const doc = await Document.findById(documentId).lean();
			if (!doc) return res.status(404).json({ message: 'Document not found' });
			documentObj = doc;
		} catch (e) {
			console.error('Failed to fetch document', e);
			return res.status(500).json({ message: 'Failed to fetch document', error: e.message });
		}

		// Return the exact document content and the matched submission id
		return res.json({ document: documentObj, submissionId: matched._id || null });
	} catch (err) {
		console.error('getDocumentContent error', err);
		return res.status(500).json({ message: 'Failed to fetch document content', error: err.message });
	}
};

/**
 * Get Submission Bin by ID
 *
 * @route GET /api/submission-bins/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getBin = async (req, res) => {
	try {
		const { id } = req.params;
		const bin = await SubmissionBin.findById(id);
		if (!bin) return res.status(404).json({ message: 'Bin not found' });

		// Enforce access for dean/secretary: only forwarded bins in their school (role-agnostic)
		if (hasRole(req, ['Dean']) || hasRole(req, ['Secretary'])) {
			const sameSchool = !req.user?.school || String(bin.school || '') === String(req.user.school || '');
			if (!sameSchool || !bin.is_forwarded) {
				return res.status(403).json({ message: 'Not authorized to access this bin' });
			}
		}
			// Enrich faculty names for submissions using user-service
			try {
				const obj = bin.toObject ? bin.toObject() : JSON.parse(JSON.stringify(bin));
				const submissions = Array.isArray(obj.submissions) ? obj.submissions : [];
				const uniqueIds = Array.from(new Set(submissions.map(s => String(s.faculty)).filter(Boolean)));
				const map = {};
				await Promise.all(uniqueIds.map(async (uid) => {
					try {
						const info = await fetchUserInfoById(uid, req, { basic: true });
						const data = info?.data || info; // allow either shape
						const name = data?.name || data?.fullname || [data?.firstname || data?.firstName, data?.lastname || data?.lastName].filter(Boolean).join(' ').trim();
						map[uid] = {
							id: uid,
							name: name || data?.email || uid,
							email: data?.email || undefined,
						};
					} catch (_) { map[uid] = { id: uid, name: uid }; }
				}));
				obj.submissions = submissions.map((s) => ({
					...s,
					faculty_user: map[String(s.faculty)] || { id: String(s.faculty), name: String(s.faculty) },
					faculty_name: (map[String(s.faculty)] && map[String(s.faculty)].name) || String(s.faculty),
				}));
				return res.json(obj);
			} catch (e) {
				// Fallback to original bin if enrichment fails
				return res.json(bin);
			}
	} catch (err) {
		console.error('getBin error', err);
		return res.status(500).json({ message: 'Failed to fetch bin', error: err.message });
	}
};

/**
 * Forward a Submission Bin to Secretary or Dean
 * @route POST /api/submission-details/:id/forward
 * @desc Department Head marks a bin as forwarded to a role ('secretary'|'dean'). Uses body.to or bin.route_to.
 */
export const forwardBin = async (req, res) => {
	try {
		if (!hasRole(req, ['Department Head'])) {
			return res.status(403).json({ message: 'Only Department Head can forward bins' });
		}
		const { id } = req.params;
		const bin = await SubmissionBin.findById(id);
		if (!bin) return res.status(404).json({ message: 'Bin not found' });

		// Only allow forwarding when the bin has been marked completed
		const isCompleted = String(bin.status || '').toLowerCase() === 'completed';
		if (!isCompleted) {
			return res.status(400).json({ message: 'Bin must be completed before it can be forwarded' });
		}
		bin.is_forwarded = true;
		bin.forwarded_at = new Date();
		bin.forwarded_by = req.user?._id || req.user?.id || null;
		await bin.save();

		// --- NEW: Notify Secretary & Dean roles that bin is ready to view ---
        try {
		const message = `Submission bin "${bin.title}" has been forwarded and can be reviewed.`;
		await postNotificationWithCallback(
			{
			type: 'submission_bin_forwarded',
			message,
			link: `/submission-details/${bin._id}`,
			recipientRoles: ['Secretary', 'Dean'],
			},
			(err) => {
			if (err) console.warn('forwardBin notification callback: failed');
			}
		);
		} catch (e) {
		console.error('forwardBin notification error', e?.message || e);
		}

		return res.json(bin);
	} catch (err) {
		console.error('forwardBin error', err);
		return res.status(500).json({ message: 'Failed to forward bin', error: err.message });
	}
};

/**
 * Update Submission Bin top-level fields and assignments
 *
 * @route PATCH /api/submission-details/:id
 * @desc Dept Head can update title, instructions, department, route_to, deadline, template_ids, faculty_ids, status
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const updateBin = async (req, res) => {
	try {
		if (!hasRole(req, ['Department Head'])) {
			return res.status(403).json({ message: 'Only Department Head can update bins' });
		}
		const { id } = req.params;
		const update = {};
		const { title, instructions, department, route_to, deadline, template_ids, faculty_ids, status, target_scope: targetScopeRaw } = req.body || {};

		if (title !== undefined) update.title = title;
		if (instructions !== undefined) update.instructions = instructions;
		if (department !== undefined) update.department = department;
		if (route_to !== undefined) update.route_to = route_to;
		if (deadline !== undefined) update.deadline = deadline;
		if (template_ids !== undefined) update.template_ids = template_ids;
		if (faculty_ids !== undefined) update.faculty_ids = faculty_ids;
		if (status !== undefined) update.status = status;
		const scopeAlias = req.body && req.body.scope !== undefined ? req.body.scope : undefined;
		const target_scope = targetScopeRaw !== undefined ? targetScopeRaw : scopeAlias;
		if (target_scope !== undefined) update.target_scope = target_scope;

		const bin = await SubmissionBin.findByIdAndUpdate(id, update, { new: true });
		if (!bin) return res.status(404).json({ message: 'Bin not found' });
		return res.json(bin);
	} catch (err) {
		console.error('updateBin error', err);
		return res.status(500).json({ message: 'Failed to update bin', error: err.message });
	}
};

/**
 * Upsert a Submission item (faculty + template) with optional per-submission instructions
 *
 * @route PUT /api/submission-details/:id/submissions
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const upsertSubmission = async (req, res) => {
	try {
		const { id } = req.params; // bin id
		const { template, faculty, instructions = '' } = req.body || {};
		if (!template || !faculty) return res.status(400).json({ message: 'template and faculty are required' });

		const bin = await SubmissionBin.findById(id);
		if (!bin) return res.status(404).json({ message: 'Bin not found' });

		// Enforce allowed templates if bin.template_ids is configured
		try {
			const allowed = Array.isArray(bin.template_ids) ? bin.template_ids.map(t => String(t)) : [];
			if (allowed.length && !allowed.includes(String(template))) {
				return res.status(400).json({ message: 'Template not allowed for this bin' });
			}
		} catch (_) { /* ignore */ }

		const existing = bin.submissions.find(s => String(s.template) === String(template) && String(s.faculty) === String(faculty));
		if (existing) {
			existing.instructions = instructions;
		} else {
			bin.submissions.push({ template, faculty, instructions, status: 'assigned' });
		}

		await bin.save();
		return res.json(bin);
	} catch (err) {
		console.error('upsertSubmission error', err);
		return res.status(500).json({ message: 'Failed to upsert submission', error: err.message });
	}
};

/**
 * Submit a Document for a specific Submission item
 *
 * @route POST /api/submission-details/:id/submissions/:submissionId/submit
 * @desc Faculty attaches a document to their assigned submission entry
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const submitDocument = async (req, res) => {
	try {
		const { id, submissionId } = req.params; // bin id + submission item id
		const { documentId } = req.body || {};
		if (!documentId) {
			return res.status(400).json({ message: 'documentId is required to submit a document' });
		}
		const bin = await SubmissionBin.findById(id);
		if (!bin) return res.status(404).json({ message: 'Bin not found' });

		// Prevent submitting into a completed bin
		if (String(bin.status || '').toLowerCase() === 'completed') {
			return res.status(400).json({ message: 'This bin is already completed; submissions are closed.' });
		}

		const item = bin.submissions.id(submissionId);
		if (!item) return res.status(404).json({ message: 'Submission item not found' });

		// Validate document exists and matches template constraints
		const doc = await Document.findById(documentId);
		if (!doc) return res.status(404).json({ message: 'Document not found' });
		const itemTemplateId = String(item.template);
		let docTemplateId = null;
		try {
			docTemplateId = doc.template_id ? String(doc.template_id) : (doc.from_template && doc.from_template.id ? String(doc.from_template.id) : null);
		} catch (_) { docTemplateId = null; }
		if (!docTemplateId) return res.status(400).json({ message: 'Document is not associated with a template' });
		console.log('submitDocument: docTemplateId=', docTemplateId, 'itemTemplateId=', itemTemplateId);
		if (docTemplateId !== itemTemplateId) return res.status(400).json({ message: 'Document template does not match required template' });
		try {
			const allowed = Array.isArray(bin.template_ids) ? bin.template_ids.map(t => String(t)) : [];
			if (allowed.length && !allowed.includes(itemTemplateId)) {
				return res.status(400).json({ message: 'This template is not allowed for this bin' });
			}
		} catch (_) { /* ignore */ }

		// Ensure documents array exists
		if (!Array.isArray(item.documents)) item.documents = [];
		// Add new document if not already present
		if (!item.documents.find(d => String(d) === String(documentId))) {
			item.documents.push(documentId);
		}
		// Mark submitted when at least one document present
		if (item.documents.length > 0 && item.status !== 'submitted') {
			item.status = 'submitted';
			item.submitted_at = new Date();
		}

		await bin.save();

		// --- NEW: Notify Department Head (bin creator) of submission ---
        try {
		const actorName = safeNameFromUser(req.user);
		const deptHeadId = bin.created_by ? String(bin.created_by) : null;
		if (deptHeadId && String(deptHeadId) !== String(req.user?.id || req.user?._id)) {
			const templateId = item.template ? String(item.template) : '';
			// Best-effort fetch of template title for human-friendly notification
			let templateName = templateId;
			try {
				if (templateId) {
					const templateServiceUrl = process.env.TEMPLATE_SERVICE_URL || 'http://localhost:8002';
					const headers = {};
					const context = req.context || {};
					if (context.token) {
						headers['Cookie'] = `token=${context.token}`;
					} else if (req.cookies && req.cookies.token) {
						headers['Cookie'] = `token=${req.cookies.token}`;
					}
					const resp = await axios.get(`${templateServiceUrl}/api/templates/${templateId}`, { headers, withCredentials: true });
					const tpl = resp?.data?.template || resp?.data || null;
					if (tpl && (tpl.title || tpl.name)) templateName = tpl.title || tpl.name;
				}
			} catch (_) { /* ignore lookup failures */ }
			const message = `${actorName} submitted a document for template "${templateName}" in submission bin "${bin.title}".`;
			await postNotificationWithCallback(
			{
				type: 'submission_item_submitted',
				message,
				link: `/submission-details/${bin._id}?submission=${item._id}`,
				targetedUserIds: [deptHeadId],
				recipientUser: deptHeadId,
			},
			(err) => {
				if (err) console.warn('submitDocument notification callback: failed');
			}
			);
		}
		} catch (e) {
		console.error('submitDocument notification error', e?.message || e);
		}

		return res.json(bin);
	} catch (err) {
		console.error('submitDocument error', err);
		return res.status(500).json({ message: 'Failed to submit document', error: err.message });
	}
};

/**
 * Unsubmit a document from a specific Submission item
 *
 * @route POST /api/submission-details/:id/submissions/:submissionId/unsubmit
 * @desc Remove one document from the submission (by documentId) or all if none specified.
 *       Only allowed while bin is not completed. If documents becomes empty, status reverts to 'assigned'.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const unsubmitDocument = async (req, res) => {
	try {
		const { id, submissionId } = req.params;
		const { documentId } = req.body || {};

		const bin = await SubmissionBin.findById(id);
		if (!bin) return res.status(404).json({ message: 'Bin not found' });

		// Disallow unsubmit if bin is completed
		if (String(bin.status || '').toLowerCase() === 'completed') {
			return res.status(400).json({ message: 'Cannot unsubmit from a completed bin.' });
		}

		const item = bin.submissions.id(submissionId);
		if (!item) return res.status(404).json({ message: 'Submission item not found' });

		// Permission: owner or privileged roles
		try {
			const actorId = String(req.user?._id || req.user?.id || '');
			const isOwner = actorId && String(item.faculty) === actorId;
			const isPrivileged = hasRole(req, ['Department Head']) || hasRole(req, ['secretary']) || hasRole(req, ['dean']);
			if (!isOwner && !isPrivileged) {
				return res.status(403).json({ message: 'Not authorized to unsubmit this item.' });
			}
		} catch (_) { /* best effort */ }

		if (!Array.isArray(item.documents)) item.documents = [];

		if (documentId) {
			item.documents = item.documents.filter(d => String(d) !== String(documentId));
		} else {
			// Clear all
			item.documents = [];
		}

		if (item.documents.length === 0) {
			item.status = 'assigned';
			item.submitted_at = null;
		}

		await bin.save();

		// --- NEW: Notify Department Head of unsubmit ---
        try {
		const actorName = safeNameFromUser(req.user);
		const deptHeadId = bin.created_by ? String(bin.created_by) : null;
		if (deptHeadId && String(deptHeadId) !== String(req.user?.id || req.user?._id)) {
			const templateId = item.template ? String(item.template) : '';
			const message = `${actorName} unsubmitted their document for template ${templateId} in submission bin "${bin.title}".`;
			await postNotificationWithCallback(
			{
				type: 'submission_item_unsubmitted',
				message,
				link: `/submission-details/${bin._id}?submission=${item._id}`,
				targetedUserIds: [deptHeadId],
				recipientUser: deptHeadId,
			},
			(err) => {
				if (err) console.warn('unsubmitDocument notification callback: failed');
			}
			);
		}
		} catch (e) {
		console.error('unsubmitDocument notification error', e?.message || e);
		}

		return res.json(bin);
	} catch (err) {
		console.error('unsubmitDocument error', err);
		return res.status(500).json({ message: 'Failed to unsubmit document', error: err.message });
	}
};

/**
 * Return a Submission item
 *
 * @route POST /api/faculty/document-workflow/:id/submissions/:submissionId/return
 * @desc Secretary/Dean returns an item with a reason; records returned_by and note
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const returnSubmission = async (req, res) => {
	try {
		if (!hasRole(req, ['secretary', 'dean', 'Department Head'])) {
			return res.status(403).json({ message: 'Only Secretary/Dean/Department Head can return submissions' });
		}

		const { id, submissionId } = req.params;
		const { reason = '' } = req.body || {};

		const bin = await SubmissionBin.findById(id);
		if (!bin) return res.status(404).json({ message: 'Bin not found' });
		const item = bin.submissions.id(submissionId);
		if (!item) return res.status(404).json({ message: 'Submission item not found' });

		item.status = 'returned';
		item.returned_at = new Date();
		item.returned_by = req.user?._id || req.user?.id || null;
	// push to notes array for history
	const returnedNote = { type: 'returned', message: reason || 'Returned', by: (req.user?._id || req.user?.id || null), at: new Date() };
	item.notes = Array.isArray(item.notes) ? item.notes : [];
	item.notes.push(returnedNote);

		await bin.save();

		// --- NEW: Notify faculty (owner) that submission was returned ---
        try {
		const facultyId = item.faculty ? String(item.faculty) : null;
		if (facultyId) {
			const roleName = safeRoleFromUser(req.user);
			const message = `${roleName} has returned your submitted document. View for indicated reasons.`;
			await postNotificationWithCallback(
			{
				type: 'submission_item_returned',
				message,
				link: `/faculty/document-workflow/${bin._id}?submission=${item._id}`,
				targetedUserIds: [facultyId],
				recipientUser: facultyId,
			},
			(err) => {
				if (err) console.warn('returnSubmission notification callback: failed');
			}
			);
		}
		} catch (e) {
		console.error('returnSubmission notification error', e?.message || e);
		}

		return res.json(bin);
	} catch (err) {
		console.error('returnSubmission error', err);
		return res.status(500).json({ message: 'Failed to return submission', error: err.message });
	}
};

/**
 *
 * @route POST /api/submission-details/:id/submissions/:submissionId/comment
 * @desc Allows authorized users (bin owner, submission faculty, Department Head, secretary, dean)
 *       to add a comment/note on a specific submission item. The note will be appended to
 *       the submission's notes array with type 'comment' by default.
 */
export const addSubmissionComment = async (req, res) => {
	try {
		const { id, submissionId } = req.params;
		const { message = '', type = 'comment' } = req.body || {};
		if (!message || String(message).trim().length === 0) {
			return res.status(400).json({ message: 'message is required' });
		}

		const bin = await SubmissionBin.findById(id);
		if (!bin) return res.status(404).json({ message: 'Bin not found' });
		const item = bin.submissions.id(submissionId);
		if (!item) return res.status(404).json({ message: 'Submission item not found' });

		// Permission: allow bin owner, submission faculty, Department Head, secretary, dean
		try {
			const actorId = String(req.user?._id || req.user?.id || '');
			const isBinOwner = actorId && String(bin.created_by || '') === actorId;
			const isSubmissionFaculty = actorId && String(item.faculty || '') === actorId;
			const isDeptHead = hasRole(req, ['Department Head']);
			const isSecretary = hasRole(req, ['secretary']);
			const isDean = hasRole(req, ['dean']);

			if (!isBinOwner && !isSubmissionFaculty && !isDeptHead && !isSecretary && !isDean) {
				return res.status(403).json({ message: 'Not authorized to comment on this submission' });
			}
		} catch (_) { /* best-effort permission check */ }

		const note = {
			type: type || 'comment',
			message: String(message),
			by: req.user?._id || req.user?.id || null,
			at: new Date(),
		};

		if (!Array.isArray(item.notes)) item.notes = [];
		item.notes.push(note);

		await bin.save();

		return res.json({ success: true, note, submission: item, binId: bin._id });
	} catch (err) {
		console.error('addSubmissionComment error', err);
		return res.status(500).json({ message: 'Failed to add comment', error: err.message });
	}
};

/**
 * Approve a Submission item
 *
 * @route POST /api/submission-details/:id/submissions/:submissionId/approve
 * @desc Secretary/Dean approves an item; records approved_by and note
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const approveSubmission = async (req, res) => {
	try {
		if (!hasRole(req, ['secretary', 'dean'])) {
			return res.status(403).json({ message: 'Only Secretary/Dean can approve submissions' });
		}

		const { id, submissionId } = req.params;

		const bin = await SubmissionBin.findById(id);
		if (!bin) return res.status(404).json({ message: 'Bin not found' });
		const item = bin.submissions.id(submissionId);
		if (!item) return res.status(404).json({ message: 'Submission item not found' });

		item.status = 'approved';
		item.approved_at = new Date();
		item.approved_by = req.user?._id || req.user?.id || null;
		item.notes.push({ type: 'general', message: 'Approved', by: (req.user?._id || req.user?.id || null) });

		await bin.save();

		// --- NEW: Notify faculty (owner) of approval ---
        try {
		const facultyId = item.faculty ? String(item.faculty) : null;
		if (facultyId) {
			const roleName = safeRoleFromUser(req.user);
			const message = `Your submitted document has been approved by the ${roleName}.`;
			await postNotificationWithCallback(
			{
				type: 'submission_item_approved',
				message,
				link: `/submission-details/${bin._id}?submission=${item._id}`,
				targetedUserIds: [facultyId],
				recipientUser: facultyId,
			},
			(err) => {
				if (err) console.warn('approveSubmission notification callback: failed');
			}
			);
		}
		} catch (e) {
		console.error('approveSubmission notification error', e?.message || e);
		}

		return res.json(bin);
	} catch (err) {
		console.error('approveSubmission error', err);
		return res.status(500).json({ message: 'Failed to approve submission', error: err.message });
	}
};

/**
 * Evaluate and mark bin completed if all submissions are terminal
 *
 * @route POST /api/submission-bins/:id/evaluate
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const evaluateBinCompletion = async (req, res) => {
	try {
		const { id } = req.params;
		const bin = await SubmissionBin.findById(id);
		if (!bin) return res.status(404).json({ message: 'Bin not found' });

		const allDone = (bin.submissions || []).every(s => ['approved','rejected'].includes(s.status));
		if (allDone) {
			bin.status = 'completed';
			await bin.save();
		}

		return res.json(bin);
	} catch (err) {
		console.error('evaluateBinCompletion error', err);
		return res.status(500).json({ message: 'Failed to evaluate bin', error: err.message });
	}
};



/**
 * @desc Export a document to PDF and upload to file-service
 * @route POST /api/documents/:id/export-pdf
 * Body (optional): { store: boolean, folderId?: string|null, filename?: string, pageSetup?: object, html?: string }
 */
export const exportDocumentPdf = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ message: 'id required' });

	const { store = true, folderId = undefined, filename: requestedFilename } = req.body || {};

		const doc = await Document.findById(id).lean();
		if (!doc) return res.status(404).json({ message: 'document not found' });

		// Allow frontend to supply the exact HTML to render (preferred when frontend already builds final HTML)
		// Body may include: { html: '<!doctype html>...</html>', store: boolean }
		const providedHtml = req.body && typeof req.body.html === 'string' ? String(req.body.html) : null;
		const maxHtmlSize = parseInt(process.env.PDF_HTML_MAX_SIZE || '2000000'); // default 2MB
		let htmlFull = null;
		if (providedHtml) {
			if (providedHtml.length === 0) return res.status(400).json({ message: 'Provided html is empty' });
			if (providedHtml.length > maxHtmlSize) return res.status(413).json({ message: 'Provided html exceeds allowed size' });
			htmlFull = providedHtml;
			console.debug && console.debug('exportDocumentPdf: using provided html from request, length =', htmlFull.length);
		} else {
			// Build HTML from pages_json and field_values
			const pages = doc.from_template?.pages_json || doc.pages_json || [];
			const htmlBody = pagesJsonToHtml(pages, doc.field_values || {});
			const logoUrl = process.env.FILE_SERVICE_URL ? `${process.env.FILE_SERVICE_URL}/assets/logo.png` : null;
			htmlFull = `<!doctype html>
			<html>
				<head>
					<meta charset="utf-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1" />
					<style>
						body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 20px; }
						.header { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
						.header img { height:40px; }
						.editable-field { background: #fff8e6; padding: 2px 4px; border-radius: 2px; }
						.page-break { page-break-after: always; }
						p { margin: 8px 0; }
					</style>
				</head>
				<body>
					<main>
						${htmlBody}
					</main>
				</body>
			</html>`;
			console.debug && console.debug('exportDocumentPdf: built html from pages_json, length =', htmlFull.length);
			
		}

		// render HTML and generate PDF using shared util
		try {
			const pageSetupToUse = req.body && req.body.pageSetup ? req.body.pageSetup : (doc.from_template?.pageSetup || doc.pageSetup || {});
			console.debug && console.debug('exportDocumentPdf: using pageSetup', pageSetupToUse);
			try {
								const cleanupCss = `
										<style>
											/* hide pagination separators/backgrounds used only for editor preview */
											.page-break, .rm-page-break, .page-break-background, .rm-page-break .page-break, .rm-page-break > .page-break { background: transparent !important; box-shadow: none !important; }
											/* hide any page-break background elements completely (editor preview bands) */
											.page-break-background, .page-break-background * { display: none !important; }
											[class*="page-break-background"], [class*="page-footer-background"], [class*="page-break-bg"] { display: none !important; }
											/* hide header separator line inserted by the editor UI */
											.nv-header-line { display: none !important; }
											/* make header/footer bands transparent (but keep their content visible) */
											.rm-page-footer, .rm-page-header, .nv-header-left, .nv-header-right { background: transparent !important; box-shadow: none !important; }
											/* remove stray borders */
											.rm-page-break, .page-break { border: none !important; }
										</style>`;
				if (/<head[^>]*>/i.test(htmlFull)) {
					htmlFull = htmlFull.replace(/<head([^>]*)>/i, `<head$1>\n${cleanupCss}`);
				} else {
					htmlFull = cleanupCss + htmlFull;
				}
			} catch (injectErr) {
				console.warn('exportDocumentPdf: failed to inject cleanup CSS', injectErr?.message || injectErr);
			}

			// generate PDF from final HTML 
			const pdfBuffer = await generatePdfBuffer(htmlFull, pageSetupToUse || {});
			try {
				console.debug && console.debug('exportDocumentPdf: generated pdfBuffer length =', pdfBuffer ? pdfBuffer.length : 0);
			} catch (logErr) {
				// non-fatal
				console.warn('exportDocumentPdf: failed to log pdfBuffer length', logErr);
			}

			if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
				console.error('exportDocumentPdf: pdfBuffer is empty or invalid');
				return res.status(500).json({ success: false, message: 'PDF generation produced empty output', dataLength: 0 });
			}

						// Determine a safe filename
						const rawTitle = (doc.title || 'document').toString();
						const safeBase = rawTitle.replace(/[^a-z0-9\-_. ]/gi, '_').trim() || 'document';
						const fileName = (requestedFilename && typeof requestedFilename === 'string') ? requestedFilename : `${safeBase}.pdf`;

						// If store=true, upload to storage service, else return inline
									if (store) {
							try {
								const ownerId = req.user?.id || req.user?._id || 'unknown';
								const fileServiceUrl = process.env.FILE_SERVICE_URL || null;
											const authHeaders = { ...buildUserServiceHeaders(req) };
											if (req.headers?.authorization) authHeaders['Authorization'] = req.headers.authorization;
											if (process.env.FILE_SERVICE_INTERNAL_TOKEN) authHeaders['x-internal-token'] = process.env.FILE_SERVICE_INTERNAL_TOKEN;
											if (req.headers && req.headers['x-user-school']) authHeaders['X-User-School'] = req.headers['x-user-school'];
											const uploadRes = await uploadPdfToStorage(
												pdfBuffer,
												{
													fileServerUrl: fileServiceUrl,
													owner: ownerId,
													folderId: (folderId === null ? null : folderId),
													filename: fileName,
													authHeaders,
												}
											);
								// Return a normalized response compatible with frontend (filePath preferred)
								return res.json({ success: true, message: 'Document exported and stored', filePath: uploadRes.filePath || null, target: uploadRes.target, details: uploadRes.raw });
							} catch (uploadErr) {
								console.error('exportDocumentPdf: storage upload failed, falling back to inline', uploadErr?.message || uploadErr);
								// Fallback to inline to avoid total failure
								const base64 = pdfBuffer.toString('base64');
								return res.json({ success: true, message: 'Document exported (inline, storage upload failed)', data: base64, contentType: 'application/pdf', dataLength: pdfBuffer.length, error: uploadErr?.message || String(uploadErr) });
							}
						}

						// store=false: Return inline base64 PDF and length metadata.
						const base64 = pdfBuffer.toString('base64');
						console.debug && console.debug('exportDocumentPdf: returning inline base64 PDF, length =', pdfBuffer.length);
						return res.json({ success: true, message: 'Document exported (inline)', data: base64, contentType: 'application/pdf', dataLength: pdfBuffer.length });
		} catch (e) {
			console.error('exportDocumentPdf error (generate/upload)', e?.message || e);
			return res.status(500).json({ message: 'Failed to render or upload PDF', error: e?.message || String(e) });
		}
	} catch (err) {
		console.error('exportDocumentPdf error', err);
		return res.status(500).json({ message: 'Failed to export document', error: err.message });
	}
};
