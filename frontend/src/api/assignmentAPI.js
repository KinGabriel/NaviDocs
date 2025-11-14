import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function assignUsersToTemplate(templateId, assigned, approver, templateData = {}, deadline) {
	try {
		const response = await axios.post(
			`${API_URL}/api/templates/assign`,
			{ assigned, approver, templateData, deadline },
			{
				withCredentials: true,
			}
		);
		return response.data;
	} catch (error) {
		return {
			success: false,
			message: error.response?.data?.message || error.message || 'Assignment failed'
		};
	}
}
