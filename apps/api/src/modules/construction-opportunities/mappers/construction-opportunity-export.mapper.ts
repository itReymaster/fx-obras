export interface ConstructionOpportunityExport {
  schemaVersion: string;
  sourceSystem: string;
  generatedAt: string;
  constructionOpportunity: Record<string, unknown>;
}

export class ConstructionOpportunityExportMapper {
  static toExportPayload(opportunity: any): ConstructionOpportunityExport {
    const tags = Array.isArray(opportunity.tags)
      ? opportunity.tags
      : opportunity.tags
        ? JSON.parse(opportunity.tags)
        : [];

    return {
      schemaVersion: "1.0",
      sourceSystem: "OBRAS_PROSPECT",
      generatedAt: new Date().toISOString(),
      constructionOpportunity: {
        id: opportunity.id,
        code: opportunity.code,
        title: opportunity.title,
        status: opportunity.status,
        constructionType: opportunity.constructionType,
        constructionStage: opportunity.constructionStage,
        commercialPotential: opportunity.commercialPotential,
        capturedAt: opportunity.capturedAt,
        address: {
          source: opportunity.addressSource,
          postalCode: opportunity.postalCode,
          street: opportunity.street,
          number: opportunity.number,
          district: opportunity.district,
          city: opportunity.city,
          state: opportunity.state,
          latitude: opportunity.latitude,
          longitude: opportunity.longitude,
          accuracy: opportunity.locationAccuracy,
        },
        contact: {
          name: opportunity.contactName,
          company: opportunity.contactCompany,
          role: opportunity.contactRole,
          phone: opportunity.contactPhone,
          email: opportunity.contactEmail,
        },
        commercial: {
          nextAction: opportunity.nextAction,
          nextActionDate: opportunity.nextActionDate,
          crmIntegrationStatus: opportunity.crmIntegrationStatus,
          crmExternalId: opportunity.crmExternalId,
        },
        photos: (opportunity.photos ?? []).map((photo: any) => ({
          id: photo.id,
          relativePath: photo.relativePath,
          mimeType: photo.mimeType,
          isPrimary: photo.isPrimary,
        })),
        notes: opportunity.notes,
        tags,
      },
    };
  }
}
