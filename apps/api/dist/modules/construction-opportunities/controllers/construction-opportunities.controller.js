import { constructionOpportunityCreateSchema, constructionOpportunityUpdateSchema, listQuerySchema, statusUpdateSchema, } from "../schemas/construction-opportunity.schemas.js";
const asParam = (value) => Array.isArray(value) ? value[0] : (value ?? "");
const mapFiles = (files = []) => {
    return files.map((file) => ({
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
    }));
};
export class ConstructionOpportunitiesController {
    service;
    constructor(service) {
        this.service = service;
    }
    create = async (req, res) => {
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
    list = async (req, res) => {
        const query = listQuerySchema.parse(req.query);
        const result = await this.service.list(query);
        res.json(result);
    };
    getById = async (req, res) => {
        const result = await this.service.getById(asParam(req.params.id));
        res.json(result);
    };
    export = async (req, res) => {
        const result = await this.service.exportById(asParam(req.params.id));
        res.json(result);
    };
    update = async (req, res) => {
        const payload = constructionOpportunityUpdateSchema.parse(req.body);
        const authenticatedUser = String(res.locals.authenticatedUser ?? "").trim();
        const payloadWithAudit = {
            ...payload,
            updatedByUserId: authenticatedUser || payload.updatedByUserId,
        };
        const result = await this.service.update(asParam(req.params.id), payloadWithAudit);
        res.json(result);
    };
    delete = async (req, res) => {
        await this.service.softDelete(asParam(req.params.id));
        res.status(204).send();
    };
    addPhotos = async (req, res) => {
        const files = mapFiles(req.files ?? []);
        const result = await this.service.addPhotos(asParam(req.params.id), files);
        res.status(201).json(result);
    };
    deletePhoto = async (req, res) => {
        await this.service.deletePhoto(asParam(req.params.id), asParam(req.params.photoId));
        res.status(204).send();
    };
    setPrimaryPhoto = async (req, res) => {
        await this.service.setPrimaryPhoto(asParam(req.params.id), asParam(req.params.photoId));
        res.status(204).send();
    };
    history = async (req, res) => {
        const result = await this.service.history(asParam(req.params.id));
        res.json(result);
    };
    updateStatus = async (req, res) => {
        const payload = statusUpdateSchema.parse(req.body);
        await this.service.updateStatus(asParam(req.params.id), payload.status, payload.reason);
        res.status(204).send();
    };
    dashboard = async (req, res) => {
        const includeTests = req.query.includeTests === "true";
        const result = await this.service.dashboard(includeTests);
        res.json(result);
    };
    integrateCrm = async (req, res) => {
        const result = await this.service.sendToCrm(asParam(req.params.id));
        res.json(result);
    };
}
