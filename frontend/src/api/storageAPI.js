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
			`${API_URL}/api/storage/create-folder`,
			{
				folderName,
				owner: user._id
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
export const getFoldersAPI = async ({ user }) => {
	try {
		const params = { userId: user._id, school: user?.role?.school || null, department: user?.role?.department || null };
		const res = await axios.get(`${API_URL}/api/storage/folders`, {
			params,
			withCredentials: true
		});
		return res.data;
	} catch (err) {
		throw err.response?.data || { message: err.message };
	}
};
/**
 * Add or update files in a folder (multi-file upload)
 * @param {string} folderId
 * @param {FileList|Array<File>} files
 * @returns {Promise<Object>}
 */
export const addDocumentsAPI = async (folderId, files,user_id,owner) => {
    console.log("Owner in API:", owner);
		const formData = new FormData();
		for (const file of files) {
			formData.append('files', file);
		}
		if (user_id) {
			formData.append('user_id', user_id);
		}
		if (owner) {
			formData.append('owner', owner);
		}
		const res = await axios.post(
			`${API_URL}/api/storage/folders/${folderId}/files`,
			formData,
			{
				withCredentials: true,
				headers: { 'Content-Type': 'multipart/form-data' },
			}
		);
		return res.data;
};

/**
 * Delete a file from a folder
 * @param {string} folderId
 * @param {string} fileId
 * @returns {Promise<Object>}
 */
export const deleteFileFromFolderAPI = async (folderId, fileId) => {
	const res = await axios.delete(
		`${API_URL}/api/storage/folders/${folderId}/files/${fileId}`,
		{ withCredentials: true }
	);
	return res.data;
};

/**
 * Delete an orphan file
 * @param {string} fileId
 * @returns {Promise<Object>}
 */
export const deleteOrphanFileAPI = async (fileId) => {
	const res = await axios.delete(
		`${API_URL}/api/storage/files/${fileId}`,
		{ withCredentials: true }
	);
	return res.data;
};

/**
 * Upload an orphan file (not in a folder)
 * @param {File} file
 * @returns {Promise<Object>}
 */
export const addOrphanFileAPI = async (file) => {
	const formData = new FormData();
	formData.append('file', file);
	const res = await axios.post(
		`${API_URL}/api/storage/files/upload-orphan`,
		formData,
		{
			withCredentials: true,
			headers: { 'Content-Type': 'multipart/form-data' },
		}
	);
	return res.data;
};

/**
 * Get folder by ID
 * @param {string} id
 * @returns {Promise<Object>}
 */
export const getFolderByIDAPI = async (id) => {
	const res = await axios.get(`${API_URL}/api/storage/folders/${id}`, {
		withCredentials: true,
	});
	return res.data;
};

/**
 * Add access to folders (share)
 * @param {Object} param0
 * @param {string} param0.folderId
 * @param {string} param0.userId
 * @param {string} [param0.school]
 * @param {string} [param0.department]
 * @returns {Promise<Object>}
 */
export const addAccessToFoldersAPI = async ({ folderId, userId, school, department }) => {
	const res = await axios.post(
		`${API_URL}/api/storage/folders/share`,
		{ folderId, userId, school, department },
		{ withCredentials: true }
	);
	return res.data;
};

/**
 * Delete folder by ID
 * @param {string} id
 * @returns {Promise<Object>}
 */
export const deleteFolderByIDAPI = async (id) => {
	const res = await axios.delete(`${API_URL}/api/storage/folders/${id}`, {
		withCredentials: true,
	});
	return res.data;
};