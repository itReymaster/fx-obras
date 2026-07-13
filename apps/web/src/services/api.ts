import axios from "axios";
import { APP_CONFIG } from "../config/app";

export const api = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
});
