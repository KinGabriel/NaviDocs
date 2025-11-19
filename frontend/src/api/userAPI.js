import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL ;


/**
 * Update user account settings (firstname, lastname)
 * @param {string} userId
 * @param {object} payload { firstname, lastname, profile_picture }
 */
export async function updateAccountSettingsAPI(userId, payload) {
	return axios.patch(
		`${API_URL}/api/user/updateAccountSettings/${userId}`,
		payload,
		{
			withCredentials: true,
		}
	);
}

/**
 * Update user password
 * @param {string} userId
 * @param {string} newPassword
 */
export async function updateUserPasswordAPI(userId, currentPassword, newPassword) {
	return axios.patch(
		`${API_URL}/api/user/updatePassword/${userId}`,
		{ currentPassword, newPassword },
		{
			withCredentials: true,
		}
	);
}

/**
 * Get userId by email (returns userId if user exists, null otherwise)
 * @param {string} email
 * @returns {Promise<string|null>} userId or null
 */
export const getUserIdByEmailAPI = async (email) => {
  try {
    const resp = await axios.get(`${API_URL}/api/user/getUserIdByEmail/${encodeURIComponent(email)}`, { withCredentials: true });
    return resp.data?.userId || null;
  } catch (err) {
    // Optionally log error or handle specific error codes
    return null;
  }
};

/**
 * Batch get users info by ids
 * @param {Array<string>} ids
 * @returns {Promise<Array<{userId:string,email?:string,firstname?:string,lastname?:string,name?:string}>>}
 */
export const getUsersInfoByIdsAPI = async (ids) => {
	if (!Array.isArray(ids) || !ids.length) return [];
	try {
		const resp = await axios.post(`${API_URL}/api/user/getUsersInfo`, { ids }, { withCredentials: true });
		return resp.data?.users || [];
	} catch (err) {
		return [];
	}
};

/**
 * Search users by email substring (for suggestions)
 * @param {string} query
 * @returns {Promise<Array<{userId: string, email: string}>>}
 */
export const searchUsersByEmailAPI = async (query) => {
	if (!query || query.length < 2) return [];
	try {
		const res = await axios.get(
			`${API_URL}/api/user/searchByEmail`,
			{
				params: { query },
				withCredentials: true,
			}
		);
		return res.data.users || [];
	} catch (err) {

		return [];
	}
};

/**
 * Get faculty members in the current user's department
 * @returns {Promise<Array<{id:string,name:string,email:string}>>}
 */
export const getFacultyByDepartmentAPI = async () => {
	try {
		const res = await axios.get(`${API_URL}/api/user/getFacultyByDepartment`, { withCredentials: true });
		// Backend returns { faculty: [{ id, name, email }] }
		return res.data?.faculty || [];
	} catch (err) {
		const e = new Error(err.response?.data?.message || err.message || 'Failed to fetch faculty by department');
		e.responseData = err.response?.data;
		e.status = err.response?.status;
		throw e;
	}
};

/**
 * Fetch both document controllers and secretaries for the current user's school
 */
export async function fetchSchoolStaffAPI() {
  try {
    const res = await axios.get(`${API_URL}/api/user/getSchoolStaff`, { withCredentials: true });
	console.log(res.data);
    return res.data;
  } catch (err) {
    throw err.response?.data || { message: 'Failed to fetch school staff' };
  }
}