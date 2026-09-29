//client/src/axiosConfig.js

import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // adjust if your backend runs on a different port
});

// Add interceptor to attach token
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

export default api;
