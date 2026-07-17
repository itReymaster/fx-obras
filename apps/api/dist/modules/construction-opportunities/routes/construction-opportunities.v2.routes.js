import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { env } from "../../../config/env.js";
import { prisma } from "../../../shared/database/prisma.js";
import { getSequelize } from "../../../shared/database/sequelize.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { ConstructionOpportunitiesController } from "../controllers/construction-opportunities.controller.js";
import { ConstructionOpportunitiesService } from "../services/construction-opportunities.service.js";
import { SequelizeConstructionOpportunityRepository } from "../v2/construction-opportunity.sequelize.repository.js";
import { ConstructionOpportunitiesV2Service } from "../v2/construction-opportunities.v2.service.js";
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.maxPhotoSizeMb * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (!allowed.includes(file.mimetype)) {
            callback(new AppError("Formato de imagem nao suportado no MVP. Use JPEG, PNG ou WebP.", 422));
            return;
        }
        callback(null, true);
    },
});
const audioUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 12 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        const allowed = [
            "audio/webm",
            "audio/mp4",
            "audio/mpeg",
            "audio/wav",
            "audio/ogg",
            "audio/x-m4a",
            "audio/aac",
        ];
        if (!allowed.includes(file.mimetype)) {
            callback(new AppError("Formato de audio nao suportado.", 422));
            return;
        }
        callback(null, true);
    },
});
const service = env.sqlDialect === "mssql"
    ? new ConstructionOpportunitiesV2Service(new SequelizeConstructionOpportunityRepository(getSequelize()))
    : new ConstructionOpportunitiesService(prisma);
const controller = new ConstructionOpportunitiesController(service);
const audioBaseRelative = `${env.uploadDir}/audio`;
const sanitizeName = (name) => name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
const asParam = (value) => Array.isArray(value) ? value[0] : (value ?? "");
const ensureOpportunityExists = async (opportunityId) => {
    await service.getById(opportunityId);
};
const getOpportunityAudioDir = (opportunityId) => path.resolve(process.cwd(), audioBaseRelative, opportunityId);
const listOpportunityAudios = async (opportunityId) => {
    const dir = getOpportunityAudioDir(opportunityId);
    try {
        const names = await fs.readdir(dir);
        const files = await Promise.all(names.map(async (name) => {
            const fullPath = path.join(dir, name);
            const stat = await fs.stat(fullPath);
            if (!stat.isFile())
                return null;
            const id = name.split("-")[0] ?? randomUUID();
            const originalName = name.split("-").slice(1).join("-") || name;
            const extension = path.extname(name).toLowerCase();
            const mimeType = extension === ".mp3"
                ? "audio/mpeg"
                : extension === ".wav"
                    ? "audio/wav"
                    : extension === ".ogg"
                        ? "audio/ogg"
                        : extension === ".m4a"
                            ? "audio/x-m4a"
                            : extension === ".aac"
                                ? "audio/aac"
                                : extension === ".mp4"
                                    ? "audio/mp4"
                                    : "audio/webm";
            return {
                id,
                originalName,
                relativePath: `${audioBaseRelative}/${opportunityId}/${name}`.replace(/\\/g, "/"),
                mimeType,
                size: stat.size,
                createdAt: stat.mtime.toISOString(),
            };
        }));
        return files
            .filter((item) => Boolean(item))
            .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    }
    catch {
        return [];
    }
};
export const constructionOpportunitiesV2Router = Router();
constructionOpportunitiesV2Router.get("/dashboard", controller.dashboard);
constructionOpportunitiesV2Router.post("/", controller.create);
constructionOpportunitiesV2Router.get("/", controller.list);
constructionOpportunitiesV2Router.get("/:id", controller.getById);
constructionOpportunitiesV2Router.get("/:id/export", controller.export);
constructionOpportunitiesV2Router.put("/:id", controller.update);
constructionOpportunitiesV2Router.patch("/:id", controller.update);
constructionOpportunitiesV2Router.delete("/:id", controller.delete);
constructionOpportunitiesV2Router.post("/:id/photos", upload.array("photos", env.maxPhotosPerOpportunity), controller.addPhotos);
constructionOpportunitiesV2Router.delete("/:id/photos/:photoId", controller.deletePhoto);
constructionOpportunitiesV2Router.patch("/:id/photos/:photoId/primary", controller.setPrimaryPhoto);
constructionOpportunitiesV2Router.get("/:id/audios", async (req, res) => {
    const opportunityId = asParam(req.params.id);
    await ensureOpportunityExists(opportunityId);
    const items = await listOpportunityAudios(opportunityId);
    res.json(items);
});
constructionOpportunitiesV2Router.post("/:id/audios", audioUpload.single("audio"), async (req, res) => {
    const opportunityId = asParam(req.params.id);
    await ensureOpportunityExists(opportunityId);
    const file = req.file;
    if (!file) {
        throw new AppError("Nenhum audio foi enviado.", 422);
    }
    const directory = getOpportunityAudioDir(opportunityId);
    await fs.mkdir(directory, { recursive: true });
    const extension = path.extname(file.originalname) || ".webm";
    const filename = `${randomUUID()}-${sanitizeName(path.basename(file.originalname, extension))}${extension}`;
    const targetPath = path.join(directory, filename);
    await fs.writeFile(targetPath, file.buffer);
    const [created] = await listOpportunityAudios(opportunityId).then((items) => items.filter((item) => item.relativePath.endsWith(`/${filename}`)));
    res.status(201).json(created ?? {
        id: filename.split("-")[0],
        originalName: file.originalname,
        relativePath: `${audioBaseRelative}/${opportunityId}/${filename}`.replace(/\\/g, "/"),
        mimeType: file.mimetype,
        size: file.size,
        createdAt: new Date().toISOString(),
    });
});
constructionOpportunitiesV2Router.delete("/:id/audios/:audioId", async (req, res) => {
    const opportunityId = asParam(req.params.id);
    const audioId = asParam(req.params.audioId);
    await ensureOpportunityExists(opportunityId);
    const dir = getOpportunityAudioDir(opportunityId);
    const names = await fs.readdir(dir).catch(() => []);
    const target = names.find((name) => name.startsWith(`${audioId}-`));
    if (!target) {
        throw new AppError("Audio nao encontrado.", 404);
    }
    await fs.unlink(path.join(dir, target));
    res.status(204).send();
});
constructionOpportunitiesV2Router.get("/:id/history", controller.history);
constructionOpportunitiesV2Router.patch("/:id/status", controller.updateStatus);
constructionOpportunitiesV2Router.post("/:id/integrations/crm", controller.integrateCrm);
