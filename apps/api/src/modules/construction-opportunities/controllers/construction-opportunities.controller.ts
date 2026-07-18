import type { Request, Response } from "express";
import {
  constructionOpportunityCreateSchema,
  constructionOpportunityUpdateSchema,
  listQuerySchema,
  statusUpdateSchema,
} from "../schemas/construction-opportunity.schemas.js";

export interface ConstructionOpportunitiesControllerService {
  create(input: unknown): Promise<unknown>;
  list(query: unknown): Promise<unknown>;
  getById(id: string): Promise<unknown>;
  exportById(id: string): Promise<unknown>;
  update(id: string, input: unknown): Promise<unknown>;
  softDelete(id: string): Promise<void>;
  addPhotos(id: string, files: Array<{ originalname: string; mimetype: string; size: number; buffer: Buffer }>): Promise<unknown>;
  deletePhoto(id: string, photoId: string): Promise<void>;
  setPrimaryPhoto(id: string, photoId: string): Promise<void>;
  history(id: string): Promise<unknown>;
  updateStatus(id: string, status: string, reason?: string): Promise<void>;
  dashboard(includeTests?: boolean): Promise<unknown>;
  sendToCrm(id: string): Promise<unknown>;
}

const asParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] : (value ?? "");

const mapFiles = (files: Express.Multer.File[] = []) => {
  return files.map((file) => ({
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    buffer: file.buffer,
  }));
};

export class ConstructionOpportunitiesController {
  constructor(private readonly service: ConstructionOpportunitiesControllerService) {}

  create = async (req: Request, res: Response) => {
    const payload = constructionOpportunityCreateSchema.parse(req.body);
    const authenticatedUser = String(res.locals.authenticatedUser ?? "").trim();
    const payloadWithAudit = {
      ...payload,
      createdByUserId: authenticatedUser || payload.createdByUserId,
      updatedByUserId: authenticatedUser || payload.updatedByUserId,
    };
    const result = await this.service.create(payloadWithAudit);
    res.status(201).json(result);
  };

  list = async (req: Request, res: Response) => {
    const query = listQuerySchema.parse(req.query);
    const result = await this.service.list(query);
    res.json(result);
  };

  getById = async (req: Request, res: Response) => {
    const result = await this.service.getById(asParam(req.params.id));
    res.json(result);
  };

  export = async (req: Request, res: Response) => {
    const result = await this.service.exportById(asParam(req.params.id));
    res.json(result);
  };

  update = async (req: Request, res: Response) => {
    const payload = constructionOpportunityUpdateSchema.parse(req.body);
    const authenticatedUser = String(res.locals.authenticatedUser ?? "").trim();
    const payloadWithAudit = {
      ...payload,
      updatedByUserId: authenticatedUser || payload.updatedByUserId,
    };
    const result = await this.service.update(asParam(req.params.id), payloadWithAudit);
    res.json(result);
  };

  delete = async (req: Request, res: Response) => {
    await this.service.softDelete(asParam(req.params.id));
    res.status(204).send();
  };

  addPhotos = async (req: Request, res: Response) => {
    const files = mapFiles((req.files as Express.Multer.File[]) ?? []);
    const result = await this.service.addPhotos(asParam(req.params.id), files);
    res.status(201).json(result);
  };

  deletePhoto = async (req: Request, res: Response) => {
    await this.service.deletePhoto(asParam(req.params.id), asParam(req.params.photoId));
    res.status(204).send();
  };

  setPrimaryPhoto = async (req: Request, res: Response) => {
    await this.service.setPrimaryPhoto(asParam(req.params.id), asParam(req.params.photoId));
    res.status(204).send();
  };

  history = async (req: Request, res: Response) => {
    const result = await this.service.history(asParam(req.params.id));
    res.json(result);
  };

  updateStatus = async (req: Request, res: Response) => {
    const payload = statusUpdateSchema.parse(req.body);
    await this.service.updateStatus(asParam(req.params.id), payload.status, payload.reason);
    res.status(204).send();
  };

  dashboard = async (req: Request, res: Response) => {
    const includeTests = req.query.includeTests === "true";
    const result = await this.service.dashboard(includeTests);
    res.json(result);
  };

  integrateCrm = async (req: Request, res: Response) => {
    const result = await this.service.sendToCrm(asParam(req.params.id));
    res.json(result);
  };
}
