import axios from "axios";
import { APP_CONFIG } from "../config/app";

export const api = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token") ?? sessionStorage.getItem("auth_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
