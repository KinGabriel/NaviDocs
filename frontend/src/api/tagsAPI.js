// src/api/tagsAPI.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ;

export async function listTagsAPI(params = {}) {
  const res = await axios.get(`${API_URL}/api/templates/tags`, {
    params,
    withCredentials: true,
  });
  return res.data;
}

export async function upsertTagAPI(payload) {
  const res = await axios.post(`${API_URL}/api/templates/tags`, payload, { withCredentials: true });
  return res.data;
}

export async function deleteTagAPI(key) {
  const res = await axios.delete(`${API_URL}/api/templates/tags/${encodeURIComponent(key)}`, { withCredentials: true });
  return res.data;
}
