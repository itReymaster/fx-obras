import { prisma } from "../../../shared/database/prisma.js";
import { getSequelize } from "../../../shared/database/sequelize.js";
import { getActiveSqlDialect } from "../../../shared/database/sql-dialect-circuit-breaker.js";
import type { ConstructionOpportunitiesControllerService } from "../controllers/construction-opportunities.controller.js";
import { ConstructionOpportunitiesService } from "../services/construction-opportunities.service.js";
import { SequelizeConstructionOpportunityRepository } from "../v2/construction-opportunity.sequelize.repository.js";
import { ConstructionOpportunitiesV2Service } from "../v2/construction-opportunities.v2.service.js";

/**
 * Seleciona Prisma(SQLite) ou Sequelize(MSSQL) em runtime via circuit breaker.
 */
export class DialectAwareOpportunitiesService implements ConstructionOpportunitiesControllerService {
  private readonly sqliteService = new ConstructionOpportunitiesService(prisma);
  private mssqlService: ConstructionOpportunitiesV2Service | null = null;

  private get inner(): ConstructionOpportunitiesControllerService {
    if (getActiveSqlDialect() === "mssql") {
      this.mssqlService ??= new ConstructionOpportunitiesV2Service(
        new SequelizeConstructionOpportunityRepository(getSequelize()),
      );
      return this.mssqlService;
    }
    return this.sqliteService;
  }

  create(input: unknown) {
    return this.inner.create(input);
  }
  list(query: unknown) {
    return this.inner.list(query);
  }
  getById(id: string) {
    return this.inner.getById(id);
  }
  exportById(id: string) {
    return this.inner.exportById(id);
  }
  update(id: string, input: unknown) {
    return this.inner.update(id, input);
  }
  softDelete(id: string) {
    return this.inner.softDelete(id);
  }
  addPhotos(
    id: string,
    files: Array<{ originalname: string; mimetype: string; size: number; buffer: Buffer }>,
  ) {
    return this.inner.addPhotos(id, files);
  }
  deletePhoto(id: string, photoId: string) {
    return this.inner.deletePhoto(id, photoId);
  }
  setPrimaryPhoto(id: string, photoId: string) {
    return this.inner.setPrimaryPhoto(id, photoId);
  }
  history(id: string) {
    return this.inner.history(id);
  }
  updateStatus(id: string, status: string, reason?: string) {
    return this.inner.updateStatus(id, status, reason);
  }
  dashboard(includeTests?: boolean) {
    return this.inner.dashboard(includeTests);
  }
  sendToCrm(id: string) {
    return this.inner.sendToCrm(id);
  }
}
