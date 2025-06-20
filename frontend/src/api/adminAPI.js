import axios from "axios";

/**
 * Fetches admin dashboard information from the API.
 * @returns {Promise<Object>} - Resolves to the dashboard information.
 * @throws {Error} - Throws an error if the request fails or token is missing.
 */
export const fetchDashboardInfoAPI = async () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error("No authentication token found.");
  try {
    const res = await axios.get("http://localhost:8000/api/admin/dashboard-info", {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch dashboard info.");
  }
};

/**
 * Fetches user accounts from the API.
 * @returns {Promise<Object>} - Resolves to the user accounts data.
 * @throws {Error} - Throws an error if the request fails or token is missing.
 */
export const fetchUsersAccountsAPI = async () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error("No authentication token found.");
  try {
    const res = await axios.get("http://localhost:8000/api/admin/get-users", {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch user accounts.");
  }
};

