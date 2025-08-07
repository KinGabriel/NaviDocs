import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const loginAPI = async (email, password) => {
    try {
        const response = await axios.post(`${API_URL}/api/users/login`, {
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