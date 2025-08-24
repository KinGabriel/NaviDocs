import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

