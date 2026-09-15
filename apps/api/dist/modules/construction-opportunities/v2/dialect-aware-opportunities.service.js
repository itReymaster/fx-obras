import { prisma } from "../../../shared/database/prisma.js";
import { getSequelize } from "../../../shared/database/sequelize.js";
import { getActiveSqlDialect } from "../../../shared/database/sql-dialect-circuit-breaker.js";
import { ConstructionOpportunitiesService } from "../services/construction-opportunities.service.js";
import { SequelizeConstructionOpportunityRepository } from "../v2/construction-opportunity.sequelize.repository.js";
import { ConstructionOpportunitiesV2Service } from "../v2/construction-opportunities.v2.service.js";
/**
 * Seleciona Prisma(SQLite) ou Sequelize(MSSQL) em runtime via circuit breaker.
 */
export class DialectAwareOpportunitiesService {
    sqliteService = new ConstructionOpportunitiesService(prisma);
    mssqlService = null;
    get inner() {
        if (getActiveSqlDialect() === "mssql") {
            this.mssqlService ??= new ConstructionOpportunitiesV2Service(new SequelizeConstructionOpportunityRepository(getSequelize()));
            return this.mssqlService;
        }
        return this.sqliteService;
    }
    create(input) {
        return this.inner.create(input);
    }
    list(query) {
        return this.inner.list(query);
    }
    getById(id) {
        return this.inner.getById(id);
    }
    exportById(id) {
        return this.inner.exportById(id);
    }
    update(id, input) {
        return this.inner.update(id, input);
    }
    softDelete(id) {
        return this.inner.softDelete(id);
    }
    addPhotos(id, files) {
        return this.inner.addPhotos(id, files);
    }
    deletePhoto(id, photoId) {
        return this.inner.deletePhoto(id, photoId);
    }
    setPrimaryPhoto(id, photoId) {
        return this.inner.setPrimaryPhoto(id, photoId);
    }
    history(id) {
        return this.inner.history(id);
    }
    updateStatus(id, status, reason) {
        return this.inner.updateStatus(id, status, reason);
    }
    setVisited(id, visited, userId) {
        if (!this.inner.setVisited) {
            throw new Error("setVisited não suportado pelo serviço ativo.");
        }
        return this.inner.setVisited(id, visited, userId);
    }
    getLocations() {
        return this.inner.getLocations ? this.inner.getLocations() : Promise.resolve([]);
    }
    dashboard(includeTests) {
        return this.inner.dashboard(includeTests);
    }
    sendToCrm(id) {
        return this.inner.sendToCrm(id);
    }
}
