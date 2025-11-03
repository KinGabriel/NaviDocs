// src/api/tagsAPI.js
import axios from 'axios';

const rawUrls = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_URLS = rawUrls.split(',');
const API_URL = API_URLS.find((url) => url.includes(window.location.hostname)) || API_URLS[0];

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
