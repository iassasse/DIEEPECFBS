import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
});

// Attach token from localStorage and prevent caching
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Prevent browser caching on all GET requests
  if (config.method === 'get') {
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
    config.params = {
      ...config.params,
      _t: Date.now()
    };
  }
  return config;
});

// Handle responses, auth errors globally, and adapt pagination metadata
api.interceptors.response.use(
  (response) => {
    // If response data is a Laravel paginated response, wrap the meta fields
    if (
      response.data &&
      typeof response.data === 'object' &&
      'current_page' in response.data &&
      'data' in response.data &&
      !response.data.meta
    ) {
      response.data = {
        data: response.data.data,
        meta: {
          current_page: response.data.current_page,
          last_page: response.data.last_page,
          from: response.data.from,
          to: response.data.to,
          total: response.data.total,
          per_page: response.data.per_page,
        }
      };
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
