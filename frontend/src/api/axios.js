import axios from 'axios';

// PRODUCTION: Gunakan path relatif /api agar backend & frontend jadi satu server
// DEVELOPMENT: Gunakan http://localhost:5000/api
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
});

// Interceptor untuk menyisipkan token
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
