import axios from "axios";
const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");

const API_URL =
  API_URLS.find(url => url.includes(window.location.hostname)) || API_URLS[0];    

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
 * @returns {Promise<void>} - Resolves when logout is successful.
 * @throws {Error} - Throws an error if logout fails.
 */
export const logoutAPI = async () => {
    try {
        await axios.post(`${API_URL}/api/auth/logout`, {}, {
            withCredentials: true 
        });
    } catch (error) {
        throw new Error(error.response?.data?.message || "Logout failed");
    }
}