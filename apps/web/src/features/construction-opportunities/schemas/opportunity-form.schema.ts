import { z } from "zod";

const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((value) => {
    if (value === null || value === "" || value === undefined) return undefined;
    if (typeof value === "number" && Number.isNaN(value)) return undefined;
    return value;
  }, schema.optional());

export const opportunityFormSchema = z.object({
  title: z.string().max(150).optional(),
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
    .default("CAPTURED"),
  constructionType: z.string().default("UNKNOWN"),
  constructionStage: z.string().default("UNKNOWN"),
  commercialPotential: z.string().default("NOT_EVALUATED"),
  addressSource: z.enum(["GPS", "MANUAL"]).default("MANUAL"),
  postalCode: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  withoutNumber: z.boolean().default(false),
  complement: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
  latitude: optionalNumber(z.number().min(-90).max(90)),
  longitude: optionalNumber(z.number().min(-180).max(180)),
  locationAccuracy: optionalNumber(z.number().min(0)),
  locationCapturedAt: z.string().optional(),
  notes: z.string().max(5000).optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  nextAction: z.string().optional(),
  nextActionDate: z.string().optional(),
  tagsText: z.string().optional(),
  isTest: z.boolean().optional().default(false),
});

export type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;
