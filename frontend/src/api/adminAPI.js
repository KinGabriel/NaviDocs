import axios from "axios";
const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");

const API_URL =
  API_URLS.find(url => url.includes(window.location.hostname)) || API_URLS[0];  

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
      `${API_URL}/api/admin/unarchive-user/${userId}`,
      {},
      { withCredentials: true }
    );
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to unarchive user account.");
  }
};


/**
 * Fetch a single user account by ID (admin only)
 * @param {string} userId
 * @returns {Promise<Object>} - Resolves to the user account data
 */
export const fetchUserAccountByIdAPI = async (userId) => {
  try {
    const res = await axios.get(`${API_URL}/api/admin/get-user/${userId}`, {
      withCredentials: true
    });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch user details.");
  }
};

/**
 * Fetch login activity logs for the Admin Login Activity table
 * @param {Object} params
 * @param {number} [params.page=1] - Page number
 * @param {number} [params.limit=10] - Page size 
 * @param {string} [params.role] - Exact role filter 
 * @param {string} [params.status] - 'active' | 'inactive'
 * @param {string} [params.date] - Filter by login date 'YYYY-MM-DD'
 * @param {string} [params.search] - Case-insensitive substring match for email
 * @returns {Promise<{success:boolean,data:Array,page:number,limit:number,total:number,pages:number}>}
 */
export const fetchLoginActivityAPI = async (params = {}) => {
  const { page = 1, limit = 10, role, status, date, search, browserName } = params;
  try {
    const res = await axios.get(`${API_URL}/api/auth/logs`, {
      withCredentials: true,
      params: { page, limit, role, status, date, search, browserName }
    });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch login activity.');
  }
};

/**
 * Export login activity as CSV for the given month and filters.
 * Returns a Blob/stream; set responseType: 'blob'.
 */
export const exportLoginActivityCSV = async (params = {}) => {
  try {
    const res = await axios.get(`${API_URL}/api/auth/logs/export`, {
      withCredentials: true,
      params,
      responseType: 'blob'
    });
    return res;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to export login activity.');
  }
};

/**
 * Delete login activity logs in batch. Provide either { ids: [...] } or { month: 'YYYY-MM' }
 */
export const deleteLoginActivityAPI = async (body = {}) => {
  try {
    const res = await axios.post(`${API_URL}/api/auth/logs/delete`, body, {
      withCredentials: true
    });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete login activity.');
  }
};

/**
 * Update an existing user (admin only)
 * @param {string} userId
 * @param {FormData} formData - multipart/form-data including optional profile_picture
 * @returns {Promise<Object>} - Resolves to the updated user payload
 */
export const updateUserAccountAPI = async (userId, formData) => {
  try {
    const res = await axios.patch(
      `${API_URL}/api/admin/edit-user/${userId}`,
      formData,
      {

        withCredentials: true,
      }
    );
    return res.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update user."
    );
  }
};
/**
 * Reset a user's password and trigger reset email
 * @param {string} userId
 */
export const resetUserPasswordAPI = async (userId) => {
  try {
    const res = await axios.patch(
      `${API_URL}/api/admin/reset-user-password/${userId}`,
      {},
      {
        withCredentials: true 
      }
    );
    return res.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to reset user password."
    );
  }
};