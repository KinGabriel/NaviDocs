import axios from "axios";
const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");

const API_URL =
	API_URLS.find(url => url.includes(window.location.hostname)) || API_URLS[0];

/**
 * Create a new document based on a template.
 * @param {Object} documentData - Payload for creating a document (title, template_id, pages_json, etc.)
 * @returns {Promise<Object>} - API response data
 */
export const createDocumentAPI = async (documentData) => {
	try {
		const res = await axios.post(`${API_URL}/api/documents/create-document`, documentData, {
			withCredentials: true,
		});
		const data = res.data;

		// If client provided suggestions to save alongside creation, persist them now as best-effort.
		if (Array.isArray(documentData.saveSuggestions) && documentData.saveSuggestions.length) {
			try {
				await Promise.allSettled(documentData.saveSuggestions.map(s => saveFieldSuggestionAPI(s)));
			} catch (e) {
				console.warn('Failed to persist some suggestions after createDocument', e);
			}
		}

		return data;
	} catch (error) {
		throw new Error(error.response?.data?.message || "Failed to create document");
	}
};

/**
 * Backwards-compatible API used by the frontend page.
 * Calls the analytics GraphQL helper and maps the result to the shape
 * expected by `departmentHeadDashboard.jsx` (templates, publishedTemplates, bins).
 */
export const getDeptHeadDashboardAPI = async () => {
	const gql = await getDeptHeadDashboardGraphQL();
	if (!gql) return { templates: [], publishedTemplates: [], bins: [] };

	const templates = (gql.ownerTemplates || []).map(t => ({
		id: t.id || t._id || null,
		title: t.title || '',
		createdBy: t.createdByName || '',
		status: t.status || ''
	}));

	const publishedTemplates = (gql.publishedRecent || []).map(t => ({
		id: t.id || t._id || null,
		code: t.code || '',
		rev: t.rev || '',
		date: t.created_at || t.createdAt || null,
		title: t.title || '',
		createdBy: t.createdByName || ''
	}));

	const bins = (gql.bins || []).map(b => ({
		id: b.id || b._id || null,
		name: b.title || b.id || '',
		totalDocs: b.documentsCount || 0,
		onTime: b.onTimeCount || b.on_time_count || 0,
		late: b.lateCount || b.late_count || 0,
		// map backend pendingCount -> frontend column 'pendingNotPassed'
		pendingNotPassed: b.pendingCount || b.pending_count || 0,
		completion: b.completion || b.completionPercent || '—'
	}));

  const upcoming = mapDeadlineBins(gql.upcoming || [], 'Upcoming');
  const dueToday = mapDeadlineBins(gql.dueToday || [], 'Due Today');
  const overdue = mapDeadlineBins(gql.overdue || [], 'Overdue');

  return { templates, publishedTemplates, bins, upcoming, dueToday, overdue };
};

/**
 * List documents with optional filters and pagination.
 * @param {Object} params - Query params (page, limit, creator, assignedTo, mine, search, status)
 * @returns {Promise<Object>} - API response data (should include pagination)
 */
export const listDocumentsAPI = async (params = {}) => {
	try {
		const res = await axios.get(`${API_URL}/api/documents/`, {
			params,
			withCredentials: true,
		});
		console.log("listDocumentsAPI response:", res.data);
		return res.data;
	} catch (error) {
		throw new Error(error.response?.data?.message || "Failed to list documents");
	}
};

export const getDeptHeadDashboardGraphQL = async () => {
	const query = `
		query DeptHeadDashboard {
			deptHeadDashboard {
				ownerCount
				deptCount
				totalReturned
				bins {
					id
					title
					department
					school
					created_by
					is_forwarded
					forwarded_at
					submissionsCount
					documentsCount
					submittedCount
					onTimeCount
					lateCount
					pendingCount
					completion
					createdAt
				}
				upcoming {
					id
					title
					department
					deadline
					is_forwarded
					is_completed
					submissionsCount
					onTimeCount
					lateCount
					pendingCount
					completion
				}
				dueToday {
					id
					title
					department
					deadline
					is_forwarded
					is_completed
					submissionsCount
					onTimeCount
					lateCount
					pendingCount
					completion
				}
				overdue {
					id
					title
					department
					deadline
					is_forwarded
					is_completed
					submissionsCount
					onTimeCount
					lateCount
					pendingCount
					completion
				}
				ownerTemplates {
					id
					title
					status
					createdByName
					created_at
					updated_at
					code
					rev
				}
				publishedRecent {
					id
					title
					status
					createdByName
					created_at
					updated_at
					code
					rev
				}
			}
		}
	`;
	try {
		const res = await axios.post(`${API_URL}/graphql`, { query }, {
			withCredentials: true,
			headers: { 'Content-Type': 'application/json' },
		});

		// GraphQL shape: { data: { deptHeadDashboard: { ... } } }
		if (res.data?.errors) {
			const msg = res.data.errors.map(e => e.message).join('; ');
			const err = new Error(msg || 'GraphQL error');
			err.graphql = res.data.errors;
			throw err;
		}
		return res.data?.data?.deptHeadDashboard ?? null;
	} catch (error) {
		// preserve status/response when available for UI handling
		// Log raw GraphQL response body (useful in browser devtools)
		console.error('GraphQL request failed:', error.response?.data || error.message || error);
		const graphqlErrors = error.response?.data?.errors;
		const message = (graphqlErrors && Array.isArray(graphqlErrors)) ? graphqlErrors.map(e => e.message).join('; ') : (error.response?.data?.message || error.message || 'Failed to fetch dept head dashboard (graphql)');
		const err = new Error(message);
		err.status = error.response?.status;
		err.responseData = error.response?.data;
		throw err;
	}
};

export const getFacultyDashboardGraphQL = async () => {
	const query = `
		query FacultyDashboard {
			facultyDashboard {
				total
				totalAssigned
				submittedCount
				onTimeCount
				lateCount
				pendingCount
				submissions {
					binId
					binTitle
					templateId
					submissionId
					status
					submittedAt
					deadline
					department
					school
					documents { id title created_by createdAt }
				}
				assignedBins {
					id
					title
					department
					school
					deadline
					submissionsCount
					submittedCount
					onTimeCount
					lateCount
					pendingCount
					completion
					userSubmission {
						submissionId
						status
						submittedAt
						documents { id title }
					}
				}
				upcomingAssigned {
					id
					title
					department
					school
					deadline
					submissionsCount
					submittedCount
					onTimeCount
					lateCount
					pendingCount
					completion
					userSubmission { submissionId status submittedAt documents { id title } }
				}
				dueTodayAssigned {
					id
					title
					department
					school
					deadline
					submissionsCount
					submittedCount
					onTimeCount
					lateCount
					pendingCount
					completion
					userSubmission { submissionId status submittedAt documents { id title } }
				}
				overdueAssigned {
					id
					title
					department
					school
					deadline
					submissionsCount
					submittedCount
					onTimeCount
					lateCount
					pendingCount
					completion
					userSubmission { submissionId status submittedAt documents { id title } }
				}
			}
		}
	`;

	try {
		const res = await axios.post(`${API_URL}/graphql`, { query }, {
			withCredentials: true,
			headers: { 'Content-Type': 'application/json' },
		});

		if (res.data?.errors) {
			const msg = res.data.errors.map(e => e.message).join('; ');
			const err = new Error(msg || 'GraphQL error');
			err.graphql = res.data.errors;
			throw err;
		}
		return res.data?.data?.facultyDashboard ?? null;
	} catch (error) {
		console.error('GraphQL request failed:', error.response?.data || error.message || error);
		const graphqlErrors = error.response?.data?.errors;
		const message = (graphqlErrors && Array.isArray(graphqlErrors)) ? graphqlErrors.map(e => e.message).join('; ') : (error.response?.data?.message || error.message || 'Failed to fetch faculty dashboard (graphql)');
		const err = new Error(message);
		err.status = error.response?.status;
		err.responseData = error.response?.data;
		throw err;
	}
};

export const getFacultyDashboardAPI = async () => {
	const gql = await getFacultyDashboardGraphQL();
	if (!gql) return { total: 0, totalAssigned: 0, submittedCount: 0, submissions: [], assignedBins: [] };

	const mapDoc = (d) => ({ id: d.id || d._id || null, title: d.title || '', created_by: d.created_by || null, createdAt: d.createdAt || null });

	const submissions = (gql.submissions || []).map(s => ({
		binId: s.binId || null,
		binTitle: s.binTitle || '',
		templateId: s.templateId || null,
		submissionId: s.submissionId || null,
		status: s.status || null,
		submittedAt: s.submittedAt || null,
		deadline: s.deadline || null,
		department: s.department || null,
		school: s.school || null,
		documents: Array.isArray(s.documents) ? s.documents.map(mapDoc) : []
	}));

	const assignedBins = (gql.assignedBins || []).map(b => ({
		id: b.id || b._id || null,
		title: b.title || '',
		department: b.department || null,
		school: b.school || null,
		deadline: b.deadline || null,
		submissionsCount: b.submissionsCount || 0,
		submittedCount: b.submittedCount || 0,
		onTimeCount: b.onTimeCount || 0,
		lateCount: b.lateCount || 0,
		pendingCount: b.pendingCount || 0,
		completion: b.completion || b.completionPercent || '—',
		userSubmission: b.userSubmission ? {
			submissionId: b.userSubmission.submissionId || b.userSubmission._id || null,
			status: b.userSubmission.status || null,
			submittedAt: b.userSubmission.submittedAt || b.userSubmission.submitted_at || null,
			documents: Array.isArray(b.userSubmission.documents) ? b.userSubmission.documents.map(d => ({ id: d.id || d._id, title: d.title })) : []
		} : null
	}));

	// Map server-provided deadline buckets (prefer GraphQL arrays)
	const upcoming = mapDeadlineBins(gql.upcomingAssigned || gql.upcoming || [], 'Upcoming');
	const dueToday = mapDeadlineBins(gql.dueTodayAssigned || gql.dueToday || [], 'Due Today');
	const overdue = mapDeadlineBins(gql.overdueAssigned || gql.overdue || [], 'Overdue');

	return {
		total: gql.total || 0,
		totalAssigned: gql.totalAssigned || 0,
		submittedCount: gql.submittedCount || 0,
		onTimeCount: gql.onTimeCount || 0,
		lateCount: gql.lateCount || 0,
		pendingCount: gql.pendingCount || 0,
		submissions,
		assignedBins,
		upcoming,
		dueToday,
		overdue
	};
};

// Map upcoming/dueToday/overdue arrays to a simple frontend-friendly shape
const mapDeadlineBins = (arr, priorityLabel) => (Array.isArray(arr) ? arr.map(b => ({
	id: b.id || b._id || null,
	title: b.title || '',
	date: b.deadline || b.createdAt || null,
	priority: priorityLabel,
	department: b.department || ''
})) : []);


/**
 * Fetch a single document by id.
 * @param {string} documentId
 * @returns {Promise<Object>} - API response data
 */
export const getDocumentByIdAPI = async (documentId) => {
	try {
		const res = await axios.get(`${API_URL}/api/documents/${documentId}`, {
			withCredentials: true,
		});
		return res.data;
	} catch (error) {
		throw new Error(error.response?.data?.message || "Failed to fetch document");
	}
};

/**
 * Rename a document (change its title).
 * @param {string} documentId
 * @param {string} newTitle
 */
export const renameDocumentAPI = async (documentId, newTitle) => {
	try {
		const res = await axios.patch(`${API_URL}/api/documents/${documentId}/rename`, { newName: newTitle }, { withCredentials: true });
		return res.data;
	} catch (error) {
		throw new Error(error.response?.data?.message || 'Failed to rename document');
	}
};

/**
 * Delete a document by id
 * @param {string} documentId
 */
export const deleteDocumentAPI = async (documentId) => {
	try {
		const res = await axios.delete(`${API_URL}/api/documents/${documentId}`, { withCredentials: true });
		return res.data;
	} catch (error) {
		throw new Error(error.response?.data?.message || 'Failed to delete document');
	}
};

/**
 * Update a document's field values (partial/patch).
 * Backend endpoint is expected to accept { field_values } and validate them.
 * @param {string} documentId
 * @param {Object} fieldValues - key/value map of field ids to values
 * @param {string} [title] - optional document title to persist alongside field values
 * @returns {Promise<Object>} - API response data
 */
export const updateDocumentFieldValuesAPI = async (documentId, fieldValues, title, saveSuggestions = []) => {
	try {
		const body = { field_values: fieldValues };
		if (title !== undefined && title !== null) body.title = title;
		if (Array.isArray(saveSuggestions) && saveSuggestions.length) body.saveSuggestions = saveSuggestions;
		const res = await axios.patch(`${API_URL}/api/documents/${documentId}/field-values`, body, {
			withCredentials: true,
		});
		const data = res.data;

		// If caller passed saveSuggestions, persist them now as best-effort.
		if (Array.isArray(saveSuggestions) && saveSuggestions.length) {
			try {
				await Promise.allSettled(saveSuggestions.map(s => saveFieldSuggestionAPI(s)));
			} catch (e) {
				console.warn('Failed to persist some suggestions after updateDocumentFieldValues', e);
			}
		}

		return data;
	} catch (error) {
		throw new Error(error.response?.data?.message || "Failed to update document field values");
	}
};

/**
 * Persist a single field suggestion.
 * suggestion: { key, value, scope }
 */
export const saveFieldSuggestionAPI = async (suggestion) => {
	try {
		const res = await axios.post(`${API_URL}/api/documents/field-suggestions`, suggestion, {
			withCredentials: true,
		});
		return res.data;
	} catch (error) {
		// Throw so Promise.allSettled can capture failure, but don't crash the main flow.
		throw new Error(error.response?.data?.message || 'Failed to save field suggestion');
	}
};

/**
 * Fetch suggestions for a given field key.
 * @param {string} key - field key
 * @param {string} [scope] - optional scope ('user'|'school')
 * @param {number} [limit] - optional limit
 * @param {string} [label] - field label metadata for matching
 * @param {string[]} [tags] - field tags metadata for matching
 * @param {('label'|'label-tags'|'any')} [matchMode] - explicit match strategy
 */

export const getFieldSuggestionsAPI = async (key, scope, limit = 10, label, tags, matchMode) => {
	try {
		const params = { key };
		if (scope) params.scope = scope;
		if (limit) params.limit = limit;
		if (label) params.label = label;
		if (Array.isArray(tags) && tags.length) params.tags = tags.join(',');
    if (matchMode) params.matchMode = matchMode;
		const res = await axios.get(`${API_URL}/api/documents/field-suggestions`, {
			params,
			withCredentials: true,
		});
		return res.data;
	} catch (error) {
		throw new Error(error.response?.data?.message || 'Failed to fetch field suggestions');
	}
};

/**
 * Fetch the canonical list of suggestion-able fields for the current user.
 * Returns { fields: [{ name, label }, ...] }
 */
export const listAllSuggestionFieldsAPI = async () => {
	try {
		const res = await axios.get(`${API_URL}/api/documents/field-suggestions/fields`, {
			withCredentials: true,
		});
		return res.data;
	} catch (error) {
		throw new Error(error.response?.data?.message || 'Failed to list suggestion fields');
	}
};

/**
 * Update a saved field suggestion
 * @param {string} id - suggestion id
 * @param {Object} updates - fields to update (e.g., { value, count })
 */
export const updateFieldSuggestionAPI = async (id, updates = {}) => {
	try {
		const res = await axios.patch(`${API_URL}/api/documents/field-suggestions/${id}`, updates, {
			withCredentials: true,
		});
		return res.data;
	} catch (error) {
		throw new Error(error.response?.data?.message || 'Failed to update field suggestion');
	}
};

/**
 * Delete a saved field suggestion
 * @param {string} id - suggestion id
 */
export const deleteFieldSuggestionAPI = async (id) => {
	try {
		const res = await axios.delete(`${API_URL}/api/documents/field-suggestions/${id}`, {
			withCredentials: true,
		});
		return res.data;
	} catch (error) {
		throw new Error(error.response?.data?.message || 'Failed to delete field suggestion');
	}
};



/**
 * Get version data by id (version_id, _id or version_no supported on server).
 * @param {string} versionId
 */
export const getVersionDataAPI = async (versionId) => {
	try {
		const res = await axios.get(`${API_URL}/api/documents/version-data/${versionId}`, { withCredentials: true });
		return res.data;
	} catch (error) {
		throw new Error(error.response?.data?.message || 'Failed to fetch version data');
	}
};



/**
 * Patch bookmark/note for a version
 * @param {string} versionId
 * @param {Object} payload - { isBookmarked?: boolean, note?: string }
 */
export const patchVersionBookmarkAPI = async (versionId, payload) => {
	try {
		const res = await axios.patch(`${API_URL}/api/documents/version-data/${versionId}/bookmark`, payload, { withCredentials: true });
		return res.data;
	} catch (error) {
		throw new Error(error.response?.data?.message || 'Failed to patch version bookmark');
	}
};

/**
 * List version data records for a document, optional grouping.
 * @param {string} documentId
 * @param {Object} params - optional query params: { group: true, group_interval_ms: number }
 */
export const listVersionDataByDocumentAPI = async (documentId, params = {}) => {
	try {
		const res = await axios.get(`${API_URL}/api/documents/version-data/document/${documentId}`, { params, withCredentials: true });
		return res.data;
	} catch (error) {
		throw new Error(error.response?.data?.message || 'Failed to list version data for document');
	}
};


/**
 * Restore a document to a specific version.
 * Sends { id, versionId } in the request body to the server.
 * @param {string} documentId
 * @param {string} versionId
 */
export const restoreDocumentVersionAPI = async (documentId, versionId) => {
	try {
		const body = { id: documentId, versionId };
		const res = await axios.post(`${API_URL}/api/documents/version-data/restore`, body, { withCredentials: true });
		return res.data;
	} catch (error) {
		throw new Error(error.response?.data?.message || 'Failed to restore document version');
	}
};

/**
 * Duplicate a document by id, optionally providing a new name in the body.
 * @param {string} documentId
 * @param {string} newTitle
 */
export const duplicateDocumentAPI = async (documentId, newTitle) => {
	try {
		const body = { newName: newTitle };
		const res = await axios.post(`${API_URL}/api/documents/${documentId}/duplicate`, body, { withCredentials: true });
		return res.data;
	} catch (error) {
		throw new Error(error.response?.data?.message || 'Failed to duplicate document');
	}
};

/**
 * Duplicate a document from a specific version number or id.
 * Accepts either a numeric versionNo (preferred) or a versionId string.
 * @param {string} documentId
 * @param {number|string} versionNoOrId - number for version_no, or string for versionId
 * @param {string} [newTitle]
 */
export const duplicateDocumentFromVersionAPI = async (documentId, versionNoOrId, newTitle) => {
	try {
		const body = {};
		if (typeof versionNoOrId === 'number' || (!isNaN(Number(versionNoOrId)) && String(versionNoOrId).trim() !== '')) {
			body.version_no = Number(versionNoOrId);
		} else if (typeof versionNoOrId === 'string') {
			body.versionId = versionNoOrId;
		} else {
			throw new Error('versionNoOrId must be a number (version_no) or a versionId string');
		}
		if (newTitle !== undefined && newTitle !== null) body.newName = newTitle;

		const res = await axios.post(`${API_URL}/api/documents/${documentId}/duplicate-version`, body, { withCredentials: true });
		return res.data;
	} catch (error) {
		throw new Error(error.response?.data?.message || 'Failed to duplicate document from version');
	}
};
/**
 * Share a document by user IDs only.
 * @param {string} documentId
 * @param {Array<Object>|Array<string>} assignees - array of assignee objects ({ userId, access }) or legacy array of userId strings
 */
export const shareDocumentAPI = async (documentId, assignees = []) => {
	try {
		// Forward the assignees array as-is. Server will normalize entries.
		const body = { assignees: Array.isArray(assignees) ? assignees : [] };
		const res = await axios.post(`${API_URL}/api/documents/${documentId}/share`, body, { withCredentials: true });
		return res.data;
	} catch (error) {
		// Attach server response for callers to inspect
		const message = error.response?.data?.message || error.message || 'Failed to share document';
		const err = new Error(message);
		err.responseData = error.response?.data;
		err.status = error.response?.status;
		throw err;
	}
};

/**
 * Archive a document by id
 * If owner, sets isArchived=true. If assigned, removes user from assigned.
 * @param {string} documentId
 */
export const archiveDocumentAPI = async (documentId) => {
  try {
    const res = await axios.patch(`${API_URL}/api/documents/${documentId}/archive`, {}, { withCredentials: true });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to archive document');
  }
};

/**
 * Unarchive a document by id (owner only)
 * @param {string} documentId
 */
export const unarchiveDocumentAPI = async (documentId) => {
	try {
		const res = await axios.patch(`${API_URL}/api/documents/${documentId}/unarchive`, {}, { withCredentials: true });
		return res.data;
	} catch (error) {
		throw new Error(error.response?.data?.message || 'Failed to unarchive document');
	}
};

/**
 * List archived documents for current user
 * @param {Object} params - Query params (page, limit)
 * @returns {Promise<Object>} - API response data (should include pagination)
 */
export const listArchivedDocumentsAPI = async (params = {}) => {
  try {
    const res = await axios.get(`${API_URL}/api/documents/archived`, {
      params,
      withCredentials: true,
    });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to list archived documents");
  }
};

// --- Unarchive / Restore a soft-deleted document
export const restoreDocumentAPI = async (documentId) => {
  try {
    const res = await axios.patch(`${API_URL}/api/documents/${documentId}/restore`, {}, { withCredentials: true });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to restore document");
  }
};

// --- Permanently delete a document (irreversible)
export const permanentlyDeleteDocumentAPI = async (documentId) => {
  try {
    // If your backend uses a different route, adjust here (e.g. /permanent or ?permanent=true)
    const res = await axios.delete(`${API_URL}/api/documents/${documentId}?permanent=true`, { withCredentials: true });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to permanently delete document");
  }
};


