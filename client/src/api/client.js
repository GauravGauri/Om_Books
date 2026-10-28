import axios from 'axios';

// Normalize API base URL: ensure no trailing slash, and append /api/v1 if not present
let rawBase = (import.meta.env.VITE_API_URL || '/api/v1').trim().replace(/\/+$/, '');
if (rawBase && !rawBase.endsWith('/api/v1') && !rawBase.endsWith('/api')) {
  rawBase = `${rawBase}/api/v1`;
}

const apiClient = axios.create({
  baseURL: rawBase || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hb_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'An unexpected error occurred';
    if (error.response?.status === 401) {
      localStorage.removeItem('hb_token');
      localStorage.removeItem('hb_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
