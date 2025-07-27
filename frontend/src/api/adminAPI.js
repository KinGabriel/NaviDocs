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
/**
 * Creates a new user account via the API.
 * @param {Object} userData - The user data to create the account.
 * @returns {Promise<Object>} - Resolves to the created user account data.
 * @throws {Error} - Throws an error if the request fails or token is missing.
 */
export const createUserAccountAPI = async (userData) => {
  const token = localStorage.getItem('token');
  console.log("Creating user with data:", userData);
  if (!token) throw new Error("No authentication token found.");
  try {
    const res = await axios.post("http://localhost:8000/api/admin/create-user", userData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to create user account.");
  }
}

