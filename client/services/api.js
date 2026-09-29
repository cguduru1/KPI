//client/services/api/api.js

import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  // baseURL: '/api',
});

// Attach token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle expired token responses
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token expired or invalid → clear storage and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Set a flag for session expiry
      localStorage.setItem('sessionExpired', 'true');
      window.location.href = '/login'; // force redirect
    }
    return Promise.reject(error);
  }
);

export default api;
