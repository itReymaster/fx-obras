import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { app } from "./app.js";
import { env } from "./config/env.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certDir = path.resolve(__dirname, "../../../certs");
const certPath = path.join(certDir, "cert.pem");
const keyPath = path.join(certDir, "key.pem");
// Verificar se certificados HTTPS existem
const useHttps = false; // fs.existsSync(certPath) && fs.existsSync(keyPath);
if (useHttps) {
    const httpsOptions = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
    };
    https.createServer(httpsOptions, app).listen(env.port, () => {
        // eslint-disable-next-line no-console
        console.log(`API running at https://localhost:${env.port}`);
    });
}
else {
    app.listen(env.port, () => {
        // eslint-disable-next-line no-console
        console.log(`API running at http://localhost:${env.port}`);
    });
}
