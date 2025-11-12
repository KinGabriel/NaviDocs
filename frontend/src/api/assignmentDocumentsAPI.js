import axios from 'axios';
const rawUrls = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_URLS = rawUrls.split(',');

const API_URL =
	API_URLS.find(url => url.includes(window.location.hostname)) || API_URLS[0];

/**
 * Export a document to PDF (backend) and optionally store it in file-service.
 * @param {string} documentId
 * @param {object} [options]
 * @param {boolean} [options.store=true] - whether the backend should upload the generated PDF to file-service
 * @returns {Promise<object>} - response data from the server ({ filePath } or { data: base64, contentType })
 */
export const exportDocumentPdfAPI = async (documentId, options = { store: true, html: null, pageSetup: null, folderId: undefined, filename: undefined }) => {
	try {
		const body = { store: options.store === undefined ? true : !!options.store };
		if (options.html && typeof options.html === 'string') body.html = options.html;
		if (options.pageSetup && typeof options.pageSetup === 'object') body.pageSetup = options.pageSetup;
		if (typeof options.folderId !== 'undefined') body.folderId = options.folderId; // root
		if (typeof options.filename === 'string') body.filename = options.filename;
		const res = await axios.post(`${API_URL}/api/documents/${documentId}/export-pdf`, body, { withCredentials: true, maxContentLength: Infinity, maxBodyLength: Infinity });
		return res.data;
	} catch (error) {
		const message = error.response?.data?.message || error.message || 'Failed to export document to PDF';
		const err = new Error(message);
		err.responseData = error.response?.data;
		err.status = error.response?.status;
		throw err;
	}
};

/**
 * List Submission Bins
 * @param {Object} [params]
 * @param {string} [params.department]
 * @param {string} [params.status]
 * @param {boolean} [params.mine]
 */
export const listSubmissionBinsAPI = async (params = {}) => {
	try {
		const res = await axios.get(`${API_URL}/api/documents/submission-bins`, {
			params: {
				department: params.department,
				status: params.status,
				mine: params.mine === true ? 'true' : undefined,
			},
			withCredentials: true,
		});
		return res.data;
	} catch (error) {
		const message = error.response?.data?.message || error.message || 'Failed to list submission bins';
		const err = new Error(message);
		err.responseData = error.response?.data;
		err.status = error.response?.status;
		throw err;
	}
};

/**
 * Get a Submission Bin by id
 * @param {string} binId
 */
export const getSubmissionBinAPI = async (binId) => {
	try {
		const res = await axios.get(`${API_URL}/api/documents/submission-bins/${binId}`, { withCredentials: true });
		return res.data;
	} catch (error) {
		const message = error.response?.data?.message || error.message || 'Failed to fetch submission bin';
		const err = new Error(message);
		err.responseData = error.response?.data;
		err.status = error.response?.status;
		throw err;
	}
};

/**
 * Create a Submission Bin (Dept Head only)
 * @param {Object} data
 */
export const createSubmissionBinAPI = async (data) => {
	try {
		const res = await axios.post(`${API_URL}/api/documents/submission-bins`, data, { withCredentials: true });
		return res.data;
	} catch (error) {
		const message = error.response?.data?.message || error.message || 'Failed to create submission bin';
		const err = new Error(message);
		err.responseData = error.response?.data;
		err.status = error.response?.status;
		throw err;
	}
};

/**
 * Update a Submission Bin (Dept Head only)
 * @param {string} binId
 * @param {Object} data
 */
export const updateSubmissionBinAPI = async (binId, data) => {
	try {
		const res = await axios.patch(`${API_URL}/api/documents/submission-bins/${binId}`, data, { withCredentials: true });
		return res.data;
	} catch (error) {
		const message = error.response?.data?.message || error.message || 'Failed to update submission bin';
		const err = new Error(message);
		err.responseData = error.response?.data;
		err.status = error.response?.status;
		throw err;
	}
};

/**
 * Forward a Submission Bin (Dept Head only)
 * @param {string} binId
 */
export const forwardSubmissionBinAPI = async (binId) => {
	try {
		const res = await axios.post(`${API_URL}/api/documents/submission-bins/${binId}/forward`, {}, { withCredentials: true });
		return res.data;
	} catch (error) {
		const message = error.response?.data?.message || error.message || 'Failed to forward submission bin';
		const err = new Error(message);
		err.responseData = error.response?.data;
		err.status = error.response?.status;
		throw err;
	}
};

/**
 * Upsert a Submission (faculty + template) in a bin
 * @param {string} binId
 * @param {{ template: string, faculty: string, instructions?: string }} data
 */
export const upsertSubmissionAPI = async (binId, data) => {
	try {
		const res = await axios.put(`${API_URL}/api/documents/submission-bins/${binId}/submissions`, data, { withCredentials: true });
		return res.data;
	} catch (error) {
		const message = error.response?.data?.message || error.message || 'Failed to upsert submission';
		const err = new Error(message);
		err.responseData = error.response?.data;
		err.status = error.response?.status;
		throw err;
	}
};

/**
 * Submit a document for a specific submission item (supports multiple documents per item)
 * @param {string} binId
 * @param {string} submissionId
 * @param {{ documentId: string }} data
 */
export const submitSubmissionDocumentAPI = async (binId, submissionId, data) => {
	try {
		const res = await axios.post(`${API_URL}/api/documents/submission-bins/${binId}/submissions/${submissionId}/submit`, data, { withCredentials: true });
		return res.data;
	} catch (error) {
		const message = error.response?.data?.message || error.message || 'Failed to submit document';
		const err = new Error(message);
		err.responseData = error.response?.data;
		err.status = error.response?.status;
		throw err;
	}
};

/**
 * Unsubmit a document from a specific submission item
 * - If documentId is provided, removes only that document.
 * - If omitted, clears all documents for that item.
 * @param {string} binId
 * @param {string} submissionId
 * @param {{ documentId?: string }} [data]
 */
export const unsubmitSubmissionDocumentAPI = async (binId, submissionId, data = {}) => {
	try {
		const res = await axios.post(`${API_URL}/api/documents/submission-bins/${binId}/submissions/${submissionId}/unsubmit`, data, { withCredentials: true });
		return res.data;
	} catch (error) {
		const message = error.response?.data?.message || error.message || 'Failed to unsubmit document';
		const err = new Error(message);
		err.responseData = error.response?.data;
		err.status = error.response?.status;
		throw err;
	}
};

/**
 * Return a submission item with reason
 * @param {string} binId
 * @param {string} submissionId
 * @param {{ reason?: string }} data
 */
export const returnSubmissionAPI = async (binId, submissionId, data = {}) => {
	try {
		const res = await axios.post(`${API_URL}/api/documents/submission-bins/${binId}/submissions/${submissionId}/return`, data, { withCredentials: true });
		return res.data;
	} catch (error) {
		const message = error.response?.data?.message || error.message || 'Failed to return submission';
		const err = new Error(message);
		err.responseData = error.response?.data;
		err.status = error.response?.status;
		throw err;
	}
};

/**
 * Add a comment/note to a specific submission item in a bin
 * @param {string} binId
 * @param {string} submissionId
 * @param {{ message: string, type?: string }} data
 */
export const addSubmissionCommentAPI = async (binId, submissionId, data = {}) => {
	try {
		if (!binId || !submissionId) throw new Error('binId and submissionId are required');
		const res = await axios.post(`${API_URL}/api/documents/submission-bins/${binId}/submissions/${submissionId}/comment`, data, { withCredentials: true });
		return res.data;
	} catch (error) {
		const message = error.response?.data?.message || error.message || 'Failed to add submission comment';
		const err = new Error(message);
		err.responseData = error.response?.data;
		err.status = error.response?.status;
		throw err;
	}
};

/**
 * List bins that reference a given document in any submission
 * @param {string} documentId
 */
export const listSubmissionBinsByDocumentAPI = async (documentId) => {
	try {
		const res = await axios.get(`${API_URL}/api/documents/submission-bins/by-document/${documentId}`, { withCredentials: true });
		return res.data;
	} catch (error) {
		const message = error.response?.data?.message || error.message || 'Failed to list bins by document';
		const err = new Error(message);
		err.responseData = error.response?.data;
		err.status = error.response?.status;
		throw err;
	}
};

/**
 * Get exact document content by contained document id (authorized viewers only)
 * @param {string} documentId
 */
export const getDocumentContentAPI = async (documentId) => {
	try {
		if (!documentId) throw new Error('documentId is required');
		const res = await axios.get(`${API_URL}/api/documents/submission-bins/document/${documentId}/content`, { withCredentials: true });
		return res.data;
	} catch (error) {
		const message = error.response?.data?.message || error.message || 'Failed to fetch document content';
		const err = new Error(message);
		err.responseData = error.response?.data;
		err.status = error.response?.status;
		throw err;
	}
};

