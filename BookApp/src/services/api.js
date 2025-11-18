import axios from 'axios';

// Use backend URL from environment variable, or default to localhost for development
// Backend server port is configurable in backend/config.env; default here matches that file
const base = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: `${base}/api`,
  timeout: 10000,
});

// Add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Globally handle auth errors (401/403) so the user is forced to re‑authenticate
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401 || status === 403) {
      // Clear any stale credentials
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Redirect to login if we are in a browser environment
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;


