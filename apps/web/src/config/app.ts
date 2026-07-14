/**
 * Configuração em runtime com suporte a subpath (ex.: /inovacao/fx-obras/).
 * Em Docker, VITE_* é injetado no build; localmente BASE_URL="/" funciona via proxy Vite.
 *
 * photo.relativePath já vem como "uploads/construction-opportunities/arquivo.jpg",
 * então uploadsBaseUrl é só origin + base da app (sem /uploads no final).
 */

const baseUrl = import.meta.env.BASE_URL || "/";
const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");

function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return `${trimTrailingSlash(baseUrl)}/api/v1`;
}

function getUploadsBaseUrl(): string {
  if (import.meta.env.VITE_UPLOADS_BASE_URL) {
    return trimTrailingSlash(import.meta.env.VITE_UPLOADS_BASE_URL);
  }
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${trimTrailingSlash(baseUrl)}`;
}

export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME ?? "Digital Rey",
  moduleName: import.meta.env.VITE_APP_MODULE_NAME ?? "Prospecção de Obras",
  apiBaseUrl: getApiBaseUrl(),
  uploadsBaseUrl: getUploadsBaseUrl(),
  baseUrl,
};
