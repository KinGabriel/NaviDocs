
import axios from "axios";
const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");

const API_URL =
  API_URLS.find(url => url.includes(window.location.hostname)) || API_URLS[0];          


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