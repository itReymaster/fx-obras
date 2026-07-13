import { Router } from "express";
import multer from "multer";
import { env } from "../../../config/env.js";
import { prisma } from "../../../shared/database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { ConstructionOpportunitiesController } from "../controllers/construction-opportunities.controller.js";
import { ConstructionOpportunitiesService } from "../services/construction-opportunities.service.js";
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
const service = new ConstructionOpportunitiesService(prisma);
const controller = new ConstructionOpportunitiesController(service);
export const constructionOpportunitiesRouter = Router();
constructionOpportunitiesRouter.get("/dashboard", controller.dashboard);
constructionOpportunitiesRouter.post("/", controller.create);
constructionOpportunitiesRouter.get("/", controller.list);
constructionOpportunitiesRouter.get("/:id", controller.getById);
constructionOpportunitiesRouter.get("/:id/export", controller.export);
constructionOpportunitiesRouter.put("/:id", controller.update);
constructionOpportunitiesRouter.patch("/:id", controller.update);
constructionOpportunitiesRouter.delete("/:id", controller.delete);
constructionOpportunitiesRouter.post("/:id/photos", upload.array("photos", env.maxPhotosPerOpportunity), controller.addPhotos);
constructionOpportunitiesRouter.delete("/:id/photos/:photoId", controller.deletePhoto);
constructionOpportunitiesRouter.patch("/:id/photos/:photoId/primary", controller.setPrimaryPhoto);
constructionOpportunitiesRouter.get("/:id/history", controller.history);
constructionOpportunitiesRouter.patch("/:id/status", controller.updateStatus);
constructionOpportunitiesRouter.post("/:id/integrations/crm", controller.integrateCrm);
