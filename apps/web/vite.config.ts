import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// HTTPS está desabilitado para debugging (HTTP apenas)
// Para reabilitar, descomentar abaixo e remover `const https = undefined`
// import fs from "fs";
// import path from "path";
// const certDir = path.resolve(__dirname, "../../certs");
// const certPath = path.join(certDir, "cert.pem");
// const keyPath = path.join(certDir, "key.pem");
// const isHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);
// const https = isHttps ? { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) } : undefined;

const https = undefined;

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
    https,
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
