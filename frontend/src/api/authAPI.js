import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL ;

/**
 * Logs in a user by sending credentials to the API.
 * @param {string} email - The user's email address.
 * @param {string} password - The user's password.
 * @returns {Promise<Object>} - Resolves to the response data from the API.
 * @throws {Error} - Throws an error if login fails.
 */
export const loginAPI = async (email, password) => {
    try {
        const response = await axios.post(`${API_URL}/api/auth/login`, {
            email,
            password
        }, {
            withCredentials: true 
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || "Login failed");
    }    
};

/**
 * Logs out the current user by calling the API.
 * When offline, only clears local session without server call.
 * @returns {Promise<void>} - Resolves when logout is successful.
 * @throws {Error} - Throws an error if logout fails.
 */
export const logoutAPI = async () => {
  // Clear local storage immediately
  localStorage.removeItem('user');
  localStorage.removeItem('user_last_refreshed');
  
  // Skip server call if offline
  if (!navigator.onLine) {
    console.log('[Auth] Offline: Logout performed locally only');
    return;
  }
  
  try {
    await axios.post(`${API_URL}/api/auth/logout`, {}, {
      withCredentials: true 
    });
  } catch (error) {
    // If network error, just log it - user is already logged out locally
    if (!navigator.onLine || error.code === 'ERR_NETWORK') {
      console.log('[Auth] Logout: Server unreachable, logged out locally');
      return;
    }
    throw new Error(error.response?.data?.message || "Logout failed");
  }
}

/**
 * Verifies if the current session is still valid.
 * If valid, updates user info in localStorage.
 * If not valid, clears session and redirects to /login.
 * When offline, preserves existing session to allow offline work.
 */
export const verifySession = async () => {
  // If offline, trust existing localStorage user data
  if (!navigator.onLine) {
    const existingUser = localStorage.getItem('user');
    if (existingUser) {
      console.log('[Auth] Offline mode: Keeping user logged in');
      return true;
    }
    console.log('[Auth] Offline mode: No cached user');
    return false;
  }

  try {
    const response = await axios.get(`${API_URL}/api/auth/verify`, {
      withCredentials: true,
    });

    // Refresh user info in localStorage
    const data = response.data;
    if (data?.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      return true;
    }
    localStorage.removeItem("user");
    return false;
  } catch (err) {
    // If network error while offline, preserve session
    if (!navigator.onLine || err.code === 'ERR_NETWORK') {
      const existingUser = localStorage.getItem('user');
      if (existingUser) {
        console.log('[Auth] Network error but offline: Keeping user logged in');
        return true;
      }
    }
    
    console.warn("Session expired or invalid", err.response?.status);
    localStorage.removeItem("user");
    return false;
  }
};
