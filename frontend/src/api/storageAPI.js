import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Create a new folder
 * @param {string} folderName
 * @param {Object} user
 * @returns {Promise<Object>}
 */
export const createFolderAPI = async ({ folderName, user, parentFolder }) => {
	try {
		const payload = {
			folderName,
			owner: user._id
		};
		if (parentFolder) payload.parentFolder = parentFolder;
		const res = await axios.post(
			`${API_URL}/api/storage/create-folder`,
			payload,
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
 * Delete an orphan file
 * @param {string} fileId
 * @returns {Promise<Object>}
 */
export const deleteFileAPI = async (fileId) => {
	const res = await axios.delete(
		`${API_URL}/api/storage/files/${fileId}`,
		{ withCredentials: true }
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
 * Upload orphan files (not in a folder)
 * @param {FileList|Array<File>} files
 * @param {string} [user_id]
 * @param {string} [owner]
 * @returns {Promise<Object>}
 */
export const addOrphanFileAPI = async (files, user_id, owner) => {
	const formData = new FormData();
	console.log("Uploading orphan files:", files);
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


/**
 * Fetch orphan files for a user (files not in any folder)
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export const getOrphanFilesAPI = async (userId) => {
	try {
		const res = await axios.get(`${API_URL}/api/storage/files/get-orphan-files`, {
			params: { userId },
			withCredentials: true
		});
		console.log("Orphan files response:", res.data);
		return res.data;
	} catch (err) {
		throw err.response?.data || { message: err.message };
	}
};

/**
 * Move a folder to a new parent
 * @param {string} folderId
 * @param {string|null} newParentId
 * @returns {Promise<Object>}
 */
export const moveFolderAPI = async (folderId, newParentId) => {
	try {
		const payload = { folderId };
		if (newParentId) payload.newParentId = newParentId;
		const res = await axios.patch(
			`${API_URL}/api/storage/folders/move-folder`,
			payload,
			{ withCredentials: true }
		);
		return res.data;
	} catch (err) {
		throw err.response?.data || { message: err.message };
	}
};

/**
 * Move a file to a new folder (or to orphan/root)
 * @param {string} fileId
 * @param {string|null} newFolderId
 * @returns {Promise<Object>}
 */
export const moveFileAPI = async (fileId, newFolderId) => {
	try {
		const payload = { fileId };
		if (newFolderId) payload.newFolderId = newFolderId;
		const res = await axios.patch(
			`${API_URL}/api/storage/files/move-file`,
			payload,
			{ withCredentials: true }
		);
		return res.data;
	} catch (err) {
		throw err.response?.data || { message: err.message };
	}
};

/**
 * Rename a folder
 * @param {string} folderId
 * @param {string} newName
 * @returns {Promise<Object>}
 */
export const renameFolderAPI = async (folderId, newName) => {
	try {
		const payload = { folderId, newName };
		const res = await axios.patch(
			`${API_URL}/api/storage/folders/rename-folder`,
			payload,
			{ withCredentials: true }
		);
		return res.data;
	} catch (err) {
		throw err.response?.data || { message: err.message };
	}
};

/**
 * Rename a file (orphan or in folder)
 * @param {string} fileId
 * @param {string} newName
 * @param {string} [folderId]
 * @returns {Promise<Object>}
 */
export const renameFileAPI = async (fileId, newName, folderId = null) => {
	try {
		const payload = { fileId, newName };
		if (folderId) payload.folderId = folderId;
		const res = await axios.patch(
			`${API_URL}/api/storage/files/rename-file`,
			payload,
			{ withCredentials: true }
		);
		return res.data;
	} catch (err) {
		throw err.response?.data || { message: err.message };
	}
};