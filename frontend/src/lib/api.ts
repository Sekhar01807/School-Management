import axios from "axios";

const resolveBaseURL = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    let clean = envUrl.trim().replace(/\/+$/, "");
    if (!clean.endsWith("/api")) {
      clean = `${clean}/api`;
    }
    return clean;
  }

  // In local development, use Vite's built-in /api proxy for 100% reliable zero-CORS connection
  if (import.meta.env.DEV) {
    return "/api";
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

// Response interceptor for transparent logging on deployment connection failures
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const targetUrl = `${error.config?.baseURL || ""}${error.config?.url || ""}`;
    console.error(`[SchoolSync API Failure] Target: ${targetUrl}`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);
