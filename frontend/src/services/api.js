import axios from 'axios';

/**
 * Central axios client for the Forensic Accounting frontend.
 *
 * Replaces the per-page pattern of constructing axios with `Authorization`
 * headers manually. Adds a 401/403 interceptor that drops the local session
 * and bounces to /login.
 *
 * Set `REACT_APP_API_BASE` (default http://localhost:3001/api) to point at a
 * remote backend.
 */
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || 'http://localhost:3001/api',
  timeout: 120000, // generous timeout for AI calls
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } catch (_) { /* ignore */ }
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

// Resource helpers — keep call sites consistent across pages.
export const resourceApi = (resource) => ({
  list: (params) => api.get(`/${resource}`, { params }),
  get: (id) => api.get(`/${resource}/${id}`),
  create: (payload) => api.post(`/${resource}`, payload),
  update: (id, payload) => api.put(`/${resource}/${id}`, payload),
  remove: (id) => api.delete(`/${resource}/${id}`),
  analyze: (id, payload = {}) => api.post(`/${resource}/${id}/analyze`, payload),
});

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (payload) => api.post('/auth/register', payload),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) => api.put('/auth/password', { currentPassword, newPassword }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
};

export default api;
