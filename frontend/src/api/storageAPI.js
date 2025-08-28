import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Create a new folder
 * @param {string} folderName
 * @param {Object} user
 * @returns {Promise<Object>}
 */
export const createFolderAPI = async ({ folderName, user }) => {
	try {
		const res = await axios.post(
			`${API_URL}/api/create-folder`,
			{
				folderName,
				owner: user.id
			},
			{ withCredentials: true }
		);
		return res.data;
	} catch (err) {
		throw err.response?.data || { message: err.message };
	}
};


/**
 * Get all folders user has access to
 * @param {Object} param0
 * @param {string} param0.userId
 * @param {string} [param0.school]
 * @param {string} [param0.department]
 * @returns {Promise<Array>}
 */
export const getFoldersAPI = async ({ userId, school, department }) => {
	try {
		const params = { userId };
		if (school) params.school = school;
		if (department) params.department = department;
		const res = await axios.get(`${API_URL}api/folders`, {
			params,
			withCredentials: true
		});
		return res.data;
	} catch (err) {
		throw err.response?.data || { message: err.message };
	}
};
