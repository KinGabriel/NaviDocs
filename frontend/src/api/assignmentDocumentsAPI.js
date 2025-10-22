import axios from 'axios';
const rawUrls = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_URLS = rawUrls.split(',');

const API_URL =
	API_URLS.find(url => url.includes(window.location.hostname)) || API_URLS[0];

/**
 * Department head assigns faculty to a document
 * @param {string} documentId
 * @param {Array<Object>|Array<string>} assignees - array of assignee objects ({ userId, access }) or legacy array of userId strings
 * @param {string} [note] - optional note to attach to the assignment
 */
export const assignFacultyByDeptHeadAPI = async (documentId, assignees = [], note = '') => {
	try {
		const body = { assignees: Array.isArray(assignees) ? assignees : [], note };
		const res = await axios.post(`${API_URL}/api/documents/${documentId}/assign-by-dept-head`, body, { withCredentials: true });
		return res.data;
	} catch (error) {
		const message = error.response?.data?.message || error.message || 'Failed to assign faculty';
		const err = new Error(message);
		err.responseData = error.response?.data;
		err.status = error.response?.status;
		throw err;
	}
};
