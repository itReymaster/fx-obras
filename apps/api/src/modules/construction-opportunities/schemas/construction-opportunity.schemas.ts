import { z } from "zod";

const stateSchema = z.string().trim().toUpperCase().length(2);

const optionalDateString = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || !Number.isNaN(new Date(value).valueOf()), {
    message: "Invalid date",
  });

const constructionOpportunityBaseSchema = z.object({
    title: z.string().trim().max(150).optional(),
    description: z.string().trim().max(1000).optional(),
    constructionType: z
      .enum([
        "RESIDENTIAL",
        "COMMERCIAL",
        "INDUSTRIAL",
        "INFRASTRUCTURE",
        "PUBLIC",
        "RENOVATION",
        "EXPANSION",
        "UNKNOWN",
        "OTHER",
      ])
      .optional(),
    constructionStage: z
      .enum([
        "SITE_PREPARATION",
        "FOUNDATION",
        "STRUCTURE",
        "MASONRY",
        "ROOFING",
        "INSTALLATIONS",
        "FINISHING",
        "PAUSED",
        "COMPLETED",
        "UNKNOWN",
      ])
      .optional(),
    commercialPotential: z.enum(["LOW", "MEDIUM", "HIGH", "NOT_EVALUATED"]).optional(),
    status: z
      .enum([
        "DRAFT",
        "CAPTURED",
        "UNDER_REVIEW",
        "SENT_TO_PROSPECTING",
        "PROSPECTING",
        "CONVERTED",
        "DISCARDED",
      ])
      .optional(),
    addressSource: z.enum(["GPS", "MANUAL"]).default("MANUAL"),
    postalCode: z.string().trim().max(16).optional(),
    street: z.string().trim().max(150).optional(),
    number: z.string().trim().max(20).optional(),
    withoutNumber: z.boolean().default(false),
    complement: z.string().trim().max(120).optional(),
    district: z.string().trim().max(80).optional(),
    city: z.string().trim().max(80).optional(),
    state: stateSchema.optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    locationAccuracy: z.number().min(0).optional(),
    locationCapturedAt: optionalDateString,
    constructionCompany: z.string().trim().max(120).optional(),
    estimatedCompletionDate: optionalDateString,
    contactName: z.string().trim().max(100).optional(),
    contactCompany: z.string().trim().max(100).optional(),
    contactRole: z.string().trim().max(80).optional(),
    contactPhone: z.string().trim().max(30).optional(),
    contactEmail: z.string().trim().email().optional(),
    nextAction: z.string().trim().max(300).optional(),
    nextActionDate: optionalDateString,
    notes: z.string().trim().max(5000).optional(),
    tags: z.array(z.string().trim().min(1)).default([]),
    capturedAt: optionalDateString,
    createdByUserId: z.string().uuid().optional(),
    updatedByUserId: z.string().uuid().optional(),
    isTest: z.boolean().default(false),
  });

export const constructionOpportunityCreateSchema = constructionOpportunityBaseSchema
  .refine(
    (value) => {
      return Boolean(
        value.latitude !== undefined ||
          value.street ||
          (value.district && value.city),
      );
    },
    {
      message:
        "Provide at least coordinates, street, or district and city for location data",
    },
  );

export const constructionOpportunityUpdateSchema = constructionOpportunityBaseSchema.partial();

export const statusUpdateSchema = z.object({
  status: z.enum([
    "DRAFT",
    "CAPTURED",
    "UNDER_REVIEW",
    "SENT_TO_PROSPECTING",
    "PROSPECTING",
    "CONVERTED",
    "DISCARDED",
  ]),
  reason: z.string().trim().max(300).optional(),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  district: z.string().trim().optional(),
  constructionType: z.string().trim().optional(),
  constructionStage: z.string().trim().optional(),
  status: z.string().trim().optional(),
  commercialPotential: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  hasPhotos: z.coerce.boolean().optional(),
  addressSource: z.string().trim().optional(),
  hasContact: z.coerce.boolean().optional(),
  hasNextAction: z.coerce.boolean().optional(),
  isTest: z.coerce.boolean().optional(),
  sortBy: z
    .enum([
      "most_recent",
      "oldest",
      "title",
      "city",
      "commercialPotential",
      "nextActionDate",
    ])
    .default("most_recent"),
});

export type ConstructionOpportunityCreateInput = z.infer<typeof constructionOpportunityCreateSchema>;
export type ConstructionOpportunityUpdateInput = z.infer<typeof constructionOpportunityUpdateSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
