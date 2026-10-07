import axios from 'axios';

// Separate client + token for customers so they never mix with staff sessions
export const CUSTOMER_TOKEN = 'kp_customer_token';

const customerApi = axios.create({
  baseURL: `${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')}/api/customer`,
});

customerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(CUSTOMER_TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

customerApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem(CUSTOMER_TOKEN)) {
      localStorage.removeItem(CUSTOMER_TOKEN);
      window.location.href = '/my/login';
    }
    return Promise.reject(err);
  }
);

export default customerApi;