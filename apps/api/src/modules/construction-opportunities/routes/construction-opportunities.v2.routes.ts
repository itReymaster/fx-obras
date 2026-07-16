import { Router } from "express";
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
      callback(
        new AppError(
          "Formato de imagem nao suportado no MVP. Use JPEG, PNG ou WebP.",
          422,
        ),
      );
      return;
    }
    callback(null, true);
  },
});

const service = env.sqlDialect === "mssql"
  ? new ConstructionOpportunitiesV2Service(
      new SequelizeConstructionOpportunityRepository(getSequelize()),
    )
  : new ConstructionOpportunitiesService(prisma);
const controller = new ConstructionOpportunitiesController(service);

export const constructionOpportunitiesV2Router = Router();

constructionOpportunitiesV2Router.get("/dashboard", controller.dashboard);
constructionOpportunitiesV2Router.post("/", controller.create);
constructionOpportunitiesV2Router.get("/", controller.list);
constructionOpportunitiesV2Router.get("/:id", controller.getById);
constructionOpportunitiesV2Router.get("/:id/export", controller.export);
constructionOpportunitiesV2Router.put("/:id", controller.update);
constructionOpportunitiesV2Router.patch("/:id", controller.update);
constructionOpportunitiesV2Router.delete("/:id", controller.delete);

constructionOpportunitiesV2Router.post(
  "/:id/photos",
  upload.array("photos", env.maxPhotosPerOpportunity),
  controller.addPhotos,
);
constructionOpportunitiesV2Router.delete("/:id/photos/:photoId", controller.deletePhoto);
constructionOpportunitiesV2Router.patch("/:id/photos/:photoId/primary", controller.setPrimaryPhoto);

constructionOpportunitiesV2Router.get("/:id/history", controller.history);
constructionOpportunitiesV2Router.patch("/:id/status", controller.updateStatus);
constructionOpportunitiesV2Router.post("/:id/integrations/crm", controller.integrateCrm);
