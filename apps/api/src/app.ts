import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { absoluteUploadDir, env } from "./config/env.js";
import { constructionOpportunitiesRouter } from "./modules/construction-opportunities/routes/construction-opportunities.routes.js";
import { errorHandler } from "./shared/http/error-handler.js";

export const app = express();

void fs.mkdir(absoluteUploadDir, { recursive: true });

const openapiPath = path.resolve(process.cwd(), "src/docs/openapi.yaml");
const openapi = YAML.load(openapiPath);

app.use(
  helmet({
    // Allows the web app (different port) to render uploaded images served by the API.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(cors({ origin: env.corsOrigin }));
app.use(morgan("dev"));
app.use(express.json({ limit: "5mb" }));
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", app: env.appName });
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.use("/api/v1/construction-opportunities", constructionOpportunitiesRouter);

app.use(errorHandler);
