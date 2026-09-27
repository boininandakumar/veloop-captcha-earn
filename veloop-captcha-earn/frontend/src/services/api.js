import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("veloop_token"); // JWT only - never gems/balance
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  register: (email, password, name) => api.post("/auth/register", { email, password, name }),
  me: () => api.get("/auth/me"),
};

export const captchaApi = {
  getCurrent: () => api.get("/captcha/current"),
  requestNew: () => api.post("/captcha/new"),
  verify: (challengeId, selectedOption) => api.post("/captcha/verify", { challengeId, selectedOption }),
  claim: (challengeId) => api.post("/captcha/claim", { challengeId }),
  noThanks: (challengeId) => api.post("/captcha/no-thanks", { challengeId }),
  history: () => api.get("/captcha/history"),
  config: () => api.get("/captcha/config"),
};

export const walletApi = {
  getGems: () => api.get("/wallet/gems"),
};

export default api;
