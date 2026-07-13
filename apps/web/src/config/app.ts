/**
 * Detecção automática de configuração em runtime
 * Funciona em: localhost, rede local, produção
 * Sem necessidade de .env.production
 */

function getApiBaseUrl(): string {
  // API sempre é relativa ao mesmo host/porta
  // O servidor (Nginx/Apache) roteia /api/* para o backend
  return "/api/v1";
}

function getUploadsBaseUrl(): string {
  if (typeof window === "undefined") return "";
  
  // Uploads sempre é relativo ao mesmo host/porta
  // O servidor roteia /uploads/* para o backend
  return window.location.origin;
}

export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME ?? "Digital Rey",
  moduleName: import.meta.env.VITE_APP_MODULE_NAME ?? "Prospecção de Obras",
  apiBaseUrl: getApiBaseUrl(),
  uploadsBaseUrl: getUploadsBaseUrl(),
};
