import axios from "axios";

const resolveBaseURL = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    return envUrl.replace(/\/$/, "");
  }

  // Fallback for local development
  return "http://localhost:5000/api";
};

export const api = axios.create({
  baseURL: resolveBaseURL(),
  withCredentials: true,
});

// Attach Authorization Bearer token header if available in localStorage as fallback
api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
