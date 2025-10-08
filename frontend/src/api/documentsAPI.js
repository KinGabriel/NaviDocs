
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
