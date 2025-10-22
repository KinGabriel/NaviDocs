import Document from '../models/documentModel.js';
import axios from 'axios';
import FormData from 'form-data';
import path from 'path';
import { createVersionData } from './documentVersionController.js';

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

		return res.json({ success: true, message: 'Document shared successfully', document: doc, assignedIds: deduped.map(a => a.userId) });
	} catch (err) {
		console.error('shareDocument error', err);
		return res.status(500).json({ message: 'Failed to share document', error: err.message });
	}
};


/**
 * @desc Department head assigns faculty to work on a document
 * @route POST /api/documents/:id/assign-by-dept-head
 * Body: { assignees: Array<string|object> }
 */
export const assignFacultyByDeptHead = async (req, res) => {
	try {
		const { id } = req.params; 
		if (!id) return res.status(400).json({ message: 'id required' });

		const { assignees = [], title, school } = req.body;

		if (!Array.isArray(assignees)) return res.status(400).json({ message: 'assignees array required' });

		// normalize assignees -> { userId, access }
		const normalize = (entry) => {
			if (!entry) return null;
			if (typeof entry === 'string' || typeof entry === 'number') return { userId: String(entry), access: 'editor' };
			if (typeof entry === 'object') {
				const userId = entry.userId || entry.id || entry._id || entry.user || null;
				if (!userId) return null;
				return { userId: String(userId), access: 'editor' };
			}
			return null;
		};

		const normalized = assignees.map(normalize).filter(Boolean);
		const invalids = assignees.map(a => ({ raw: a, normalized: normalize(a) })).filter(x => !x.normalized);
		if (invalids.length) return res.status(400).json({ message: 'Some assignees were invalid', invalids });

		const seen = new Set();
		const deduped = [];
		for (const a of normalized) {
			if (!a || !a.userId) continue;
			if (seen.has(a.userId)) continue;
			seen.add(a.userId);
			deduped.push(a);
		}

		// treat id as template id and create document based on template
		const payload = { ...(req.body || {}) };
		payload.template_id = id;
		if (!payload.title || String(payload.title).trim() === '') payload.title = title || 'Untitled Document';
		if (!payload.created_by) payload.created_by = req.user?.id;

		// fetch template snapshot
		try {
			const templateServiceUrl = process.env.TEMPLATE_SERVICE_URL || 'http://localhost:8002';
			const context = req.context || payload.context || {};
			const headers = {};
			if (context.token) headers['Cookie'] = `token=${context.token}`;
			else if (req.cookies && req.cookies.token) headers['Cookie'] = `token=${req.cookies.token}`;
			const resp = await axios.get(`${templateServiceUrl}/api/templates/${payload.template_id}`, { headers, withCredentials: true });
			if (resp.data && resp.data.template) {
				const template = resp.data.template;
				payload.from_template = {
					id: template._id,
					title: template.title,
					document_code: template.document_code || null,
					revision_no: template.revision_no !== undefined && template.revision_no !== null ? String(template.revision_no) : null,
					effectivity: template.effectivity || null,
					fields: Array.isArray(template.fields) ? template.fields : [],
					pages_json: Array.isArray(template.pages_json) ? template.pages_json : [],
					pageSetup: template.pageSetup || {},
					logoConfig: template.logoConfig || {},
					status_meta: template.status_meta || {},
					dateFormat: template.dateFormat || {},
					assigned: Array.isArray(template.assigned) ? template.assigned : [],
					snapshot_at: new Date()
				};

				payload.title = payload.title || template.title || payload.title;
				payload.pages_json = Array.isArray(payload.pages_json) && payload.pages_json.length ? payload.pages_json : template.pages_json || payload.pages_json;
				if (template.document_code) payload.document_code = payload.document_code || template.document_code;
				if (template.revision_no !== undefined && template.revision_no !== null) payload.revision_no = payload.revision_no || String(template.revision_no);
				if (template.effectivity) payload.effectivity = payload.effectivity || template.effectivity;
				if (Array.isArray(template.fields) && template.fields.length) {
					payload.metadata = payload.metadata || {};
					payload.metadata.template_fields = payload.metadata.template_fields || template.fields;
				}
			}
		} catch (err) {
			console.warn('Failed to fetch template for creation (continuing):', err?.message || err);
		}

		if (!Array.isArray(payload.pages_json)) {
			payload.pages_json = [{ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] }];
		}

		// ensure assigned is set to deduped (objects)
		payload.assigned = deduped;

		// accept optional deadline (ISO string or timestamp)
		if (payload.deadline) {
			const d = new Date(payload.deadline);
			if (!isNaN(d.getTime())) payload.deadline = d;
			else payload.deadline = null;
		}

		const docToCreate = new Document({ ...payload });
		// set submission_link if provided
		if (payload.submission_link) docToCreate.submission_link = payload.submission_link;
		// set school and department from authenticated user when available
		docToCreate.school = req.user?.school || req.user?.role?.school || payload.school || '';
		docToCreate.department = req.user?.department || req.user?.role?.department || payload.department || null;


		// mark document as assigned
		docToCreate.status = 'assigned';

		try {
			await docToCreate.save();
			// create initial version data fire-and-forget
			try {
				createVersionData(String(docToCreate._id), payload.field_values || {}, {
					userId: req.user?.id || null,
					note: 'initial version',
					last_activity_at: payload.last_activity_at || new Date()
				});
			} catch (e) {
				console.error('createVersionData failed', e);
			}
			return res.status(201).json({ success: true, message: 'Document created from template and faculty assigned', document: docToCreate, assigned: deduped.map(a => a.userId) });
		} catch (saveErr) {
			console.error('Failed to create document from template', saveErr);
			return res.status(500).json({ message: 'Failed to create document from template', error: saveErr.message || String(saveErr) });
		}
	} catch (err) {
		console.error('assignFacultyByDeptHead error', err);
		return res.status(500).json({ message: 'Failed to assign faculty', error: err.message });
	}
};


/**
 * @desc Submit a document (save submission_link). Faculty will call this to attach their PDF link.
 * @route PATCH /api/documents/:id/submission
 * Body: { submission_link: string }
 * TO BE COMPLETED
 */
export const submitDocumentLink = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ message: 'id required' });

		// Accept either a file upload (req.file) or a direct submission_link in body.
		// If a file is provided and body.store !== 'false' (default true), forward to File Service /api/files/upload/document
		// If file is provided and body.store === 'false', create a default path string without storing the file.
		const { submission_link, store } = req.body || {};



		let finalLink = null;

		// If a file was uploaded via multipart form (multer.memoryStorage), forward it to file-service unless store === 'false'
		if (req.file) {
			const keepInStorage = !(String(store).toLowerCase() === 'false');
			const originalName = req.file.originalname || `upload_${Date.now()}`;
			const ext = path.extname(originalName) || '';

			if (keepInStorage) {
				try {
					const fileServerUrl = process.env.FILE_SERVICE_URL || 'http://localhost:5005';
					const form = new FormData();
					// file field name expected by file-service is 'document'
					form.append('document', req.file.buffer, { filename: originalName, contentType: req.file.mimetype });
					// owner: prefer school, then user id
					const owner = req.user?.school || req.user?.role?.school || req.user?.id || 'unknown';
					form.append('owner', String(owner));
					form.append('documentId', String(id));
					form.append('folderName', 'submissions');

					const headers = { ...form.getHeaders() };
					const uploadResp = await axios.post(`${fileServerUrl}/api/files/upload/document`, form, { headers, timeout: 20000 });
					// file-service returns filePath or path
					finalLink = uploadResp?.data?.filePath || uploadResp?.data?.path || uploadResp?.data?.filePath || null;
				} catch (e) {
					console.error('Failed to upload submission file to file-service', e?.message || e);
					return res.status(500).json({ message: 'Failed to upload file to storage', error: e?.message || String(e) });
				}
			} else {
				// Do not store the file in file-service — create a default path string for reference
				const owner = req.user?.school || req.user?.role?.school || req.user?.id || 'public';
				finalLink = `/uploads/${owner}/submissions/${id}_${Date.now()}${ext}`;
			}
		} else if (submission_link && typeof submission_link === 'string') {
			finalLink = submission_link;
		} else {
			return res.status(400).json({ message: 'Either a file upload or submission_link (string) is required' });
		}

		// set submission link and mark status as submitted
		// load document to update
		const doc = await Document.findById(id);
		if (!doc) return res.status(404).json({ message: 'document not found' });

		doc.submission_link = finalLink;
		doc.status = 'submitted';

        // add audit note
		try {
			const actor = req.user?.id || null;
			const note = { action: 'submit', by: actor, submission_link: finalLink, at: new Date() };
			doc.notes = Array.isArray(doc.notes) ? [note, ...doc.notes] : [note];
		} catch (e) {
			console.warn('Failed to append submit note', e?.message || e);
		}

		try {
			await doc.save();
		} catch (saveErr) {
			console.error('Failed to save submission link', saveErr);
			return res.status(500).json({ message: 'Failed to save submission link', error: saveErr.message || String(saveErr) });
		}

		return res.json({ success: true, message: 'Submission link saved', document: doc });
	} catch (err) {
		console.error('submitDocumentLink error', err);
		return res.status(500).json({ message: 'Failed to submit document', error: err.message });
	}
};
