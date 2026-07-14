import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

// Detectar e carregar certificados HTTPS
const certDir = path.resolve(__dirname, "../../certs");
const certPath = path.join(certDir, "cert.pem");
const keyPath = path.join(certDir, "key.pem");

// Enable HTTPS when certificates exist
const isHttps = false; // fs.existsSync(certPath) && fs.existsSync(keyPath);
const https = isHttps
  ? {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    }
  : undefined;

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
      https: isHttps ? https : undefined,
      proxy: {
        "/api": {
          target: isHttps ? "https://127.0.0.1:3333" : "http://127.0.0.1:3333",
          changeOrigin: true,
          secure: false,
          rejectUnauthorized: false,
        },
        "/uploads": {
          target: isHttps ? "https://127.0.0.1:3333" : "http://127.0.0.1:3333",
          changeOrigin: true,
          secure: false,
          rejectUnauthorized: false,
        },
      },
    },
  };
});
