import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const basePath = env.VITE_BASE_PATH || "/";

  return {
  base: basePath,
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5175,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3333",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:3333",
        changeOrigin: true,
      },
    },
  },
  };
});
