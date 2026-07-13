const origin = typeof window !== "undefined" ? window.location.origin : "";

export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME ?? "Digital Rey",
  moduleName: import.meta.env.VITE_APP_MODULE_NAME ?? "Prospecção de Obras",
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
  uploadsBaseUrl:
    import.meta.env.VITE_UPLOADS_BASE_URL ?? origin,
};
