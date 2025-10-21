import Document from '../models/documentModel.js';

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

