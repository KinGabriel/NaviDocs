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
 */
export const getFieldSuggestionsAPI = async (key, scope, limit = 10) => {
	try {
		const params = { key };
		if (scope) params.scope = scope;
		if (limit) params.limit = limit;
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

