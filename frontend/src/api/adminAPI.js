import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Fetches admin dashboard information from the API.
 * @returns {Promise<Object>} - Resolves to the dashboard information.
 * @throws {Error} - Throws an error if the request fails.
 */
export const fetchDashboardInfoAPI = async () => {
  const query = `
    query {
      adminDashboard {
        total
        dean
        deptHead
        faculty
        recentUsers {
          email
          firstname
          lastname
          profile_picture
          role { name school department }
          createdAt
        }
      }
    }
  `;
  try {
    const res = await axios.post(
      `${API_URL}/graphql`,
      { query },
      { withCredentials: true }
    );
    return res.data.data.adminDashboard;
  } catch (error) {
    throw new Error(error.response?.data?.errors?.[0]?.message || "Failed to fetch dashboard info.");
  }
};

/**
 * Fetches user accounts from the API.
 * @returns {Promise<Object>} - Resolves to the user accounts data.
 * @throws {Error} - Throws an error if the request fails.
 */
export const fetchUsersAccountsAPI = async () => {
  try {
    const res = await axios.get(`${API_URL}/api/admin/get-users`, {
      withCredentials: true 
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
 * @throws {Error} - Throws an error if the request fails.
 */
export const createUserAccountAPI = async (userData) => {
  try {
    const res = await axios.post(`${API_URL}/api/admin/create-user`, userData, {
      withCredentials: true
    });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to create user account.");
  }
}

/**
 * Archives a user account 
 * @param {string} userId - The ID of the user to archive.
 * @returns {Promise<Object>} - Resolves to the archived user account data.
 * @throws {Error} - Throws an error if the request fails.
 */
export const archiveUserAccountAPI = async (userId) => {
  try {
    const res = await axios.patch(
      `${API_URL}/api/admin/archive-user/${userId}`,
      {},
      { withCredentials: true }
    );
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to archive user account.");
  }
};

/**
 * unarchive a user account 
 * @param {string} userId - The ID of the user to unarchive.
 * @returns {Promise<Object>} - Resolves to the unarchived user account data.
 * @throws {Error} - Throws an error if the request fails.
 */
export const unarchiveUserAccountAPI = async (userId) => {
  try {
    const res = await axios.patch(
      `${API_URL}/api/admin/archive-user/${userId}`,
      {},
      { withCredentials: true }
    );
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to archive user account.");
  }
};
