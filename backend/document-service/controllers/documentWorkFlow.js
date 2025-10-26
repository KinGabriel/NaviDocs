import Document from '../models/documentModel.js';
import axios from 'axios';
import FormData from 'form-data';
import path from 'path';
import { createVersionData } from './documentVersionController.js';
import { escapeHtml, buildDocumentHtml, pagesJsonToHtml, generatePdfBuffer, uploadPdfToStorage, uploadPdfBuffer } from '../utils/pdfExportUtil.js';
import { buildUserServiceHeaders } from '../utils/userServiceUtils.js';

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

			// For now do not forward files to file-service. Store submission as inline data URL (base64).
			const b64 = req.file.buffer.toString('base64');
			finalLink = `data:${req.file.mimetype};base64,${b64}`;
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
