import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

// Detectar e carregar certificados HTTPS
const certDir = path.resolve(__dirname, "../../certs");
const certPath = path.join(certDir, "cert.pem");
const keyPath = path.join(certDir, "key.pem");

// Disable HTTPS for browser testing (uncomment below to enable HTTPS on network)
const isHttps = false; // fs.existsSync(certPath) && fs.existsSync(keyPath);
const https = isHttps
  ? {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    }
  : undefined;

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    base: "/",
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5175,
      strictPort: false,
      https: isHttps ? https : undefined,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:3333",
          changeOrigin: true,
          secure: false,
          rejectUnauthorized: false,
        },
        "/uploads": {
          target: "http://127.0.0.1:3333",
          changeOrigin: true,
          secure: false,
          rejectUnauthorized: false,
        },
      },
    },
  };
});
