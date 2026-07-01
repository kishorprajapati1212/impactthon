import axios from "axios";
const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
const axiosInstance = axios.create({ baseURL: BASE, timeout: 30000, headers: { "Content-Type": "application/json" } });
axiosInstance.interceptors.request.use(config => {
  try { const { token } = JSON.parse(localStorage.getItem("attendx_user") || "{}"); if (token) config.headers.Authorization = `Bearer ${token}`; } catch {}
  return config;
}, e => Promise.reject(e));
axiosInstance.interceptors.response.use(r => r, e => {
  if (e.response?.status === 401) { localStorage.removeItem("attendx_user"); window.location.href = "/login"; }
  return Promise.reject(e);
});
export default axiosInstance;
