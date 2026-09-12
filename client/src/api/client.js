import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stackit_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiError(err, fallback = 'Something went wrong') {
  const data = err?.response?.data;
  if (data?.error?.message) return { message: data.error.message, details: data.error.details, status: err.response.status, code: data.error.code };
  if (err?.code === 'ECONNABORTED') return { message: 'Request timed out. Check your connection and retry.' };
  if (err?.message === 'Network Error') return { message: 'Cannot reach the server. Is the backend running?' };
  return { message: fallback };
}

export function assetUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
  if (url.startsWith('/')) return `${base}${url}`;
  return url;
}

export default api;
