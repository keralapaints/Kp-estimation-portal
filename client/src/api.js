import axios from 'axios';

const api = axios.create({
  baseURL: `${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('kp_token')) {
      localStorage.removeItem('kp_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';
export default api;
