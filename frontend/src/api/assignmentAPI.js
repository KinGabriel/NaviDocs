import axios from "axios";
const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");
const API_URL =
  API_URLS.find(url => url.includes(window.location.hostname)) || API_URLS[0]; 

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
