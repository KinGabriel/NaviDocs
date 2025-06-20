import axios from "axios";

export const loginAPI = async (email, password) => {
    try {
        const response = await axios.post("http://localhost:8000/api/users/login", {
            email,
            password
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || "Login failed");
    }    
};