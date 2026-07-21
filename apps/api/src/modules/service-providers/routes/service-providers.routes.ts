import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../../shared/database/prisma.js";

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  type: z.string().trim().optional(),
});

const createServiceProviderSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email().optional(),
  city: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional(),
});

const bindProvidersSchema = z.object({
  providerIds: z.array(z.string().trim().min(1)).default([]),
});

const bindOpportunitiesSchema = z.object({
  opportunityIds: z.array(z.string().trim().min(1)).default([]),
});

const asParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] : (value ?? "");

export const serviceProvidersRouter = Router();

serviceProvidersRouter.get("/", async (req, res) => {
  const query = listQuerySchema.parse(req.query);

  const where = {
    deletedAt: null,
    ...(query.type ? { type: query.type } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { city: { contains: query.search } },
            { type: { contains: query.search } },
          ],
        }
      : {}),
  };

  const items = await prisma.serviceProvider.findMany({
    where,
    orderBy: [{ name: "asc" }],
  });

  res.json(items);
});

serviceProvidersRouter.post("/", async (req, res) => {
  const payload = createServiceProviderSchema.parse(req.body);
  const created = await prisma.serviceProvider.create({
    data: {
      ...payload,
      name: payload.name.toUpperCase(),
      type: payload.type.toUpperCase(),
    },
  });

  res.status(201).json(created);
});

serviceProvidersRouter.get("/opportunities/:id", async (req, res) => {
  const opportunityId = asParam(req.params.id);

  const links = await prisma.opportunityServiceProvider.findMany({
    where: { constructionOpportunityId: opportunityId },
    include: { serviceProvider: true },
    orderBy: [{ createdAt: "desc" }],
  });

  res.json(
    links.map((link) => ({
      id: link.id,
      role: link.role,
      createdAt: link.createdAt,
      provider: link.serviceProvider,
    })),
  );
});

serviceProvidersRouter.put("/opportunities/:id", async (req, res) => {
  const opportunityId = asParam(req.params.id);
  const payload = bindProvidersSchema.parse(req.body);

  await prisma.constructionOpportunity.findFirstOrThrow({
    where: { id: opportunityId, isDeleted: false },
    select: { id: true },
  });

  const uniqueProviderIds = [...new Set(payload.providerIds)];

  if (uniqueProviderIds.length > 0) {
    const existingProviders = await prisma.serviceProvider.findMany({
      where: {
        id: { in: uniqueProviderIds },
        deletedAt: null,
      },
      select: { id: true },
    });

    const foundSet = new Set(existingProviders.map((item) => item.id));
    const invalidIds = uniqueProviderIds.filter((id) => !foundSet.has(id));
    if (invalidIds.length > 0) {
      res.status(422).json({ message: "Prestador(es) inválido(s)", invalidIds });
      return;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.opportunityServiceProvider.deleteMany({
      where: { constructionOpportunityId: opportunityId },
    });

    if (uniqueProviderIds.length === 0) return;

    await tx.opportunityServiceProvider.createMany({
      data: uniqueProviderIds.map((serviceProviderId) => ({
        constructionOpportunityId: opportunityId,
        serviceProviderId,
      })),
    });
  });

  const links = await prisma.opportunityServiceProvider.findMany({
    where: { constructionOpportunityId: opportunityId },
    include: { serviceProvider: true },
    orderBy: [{ createdAt: "desc" }],
  });

  res.json(
    links.map((link) => ({
      id: link.id,
      role: link.role,
      createdAt: link.createdAt,
      provider: link.serviceProvider,
    })),
  );
});

serviceProvidersRouter.get("/:id/opportunities", async (req, res) => {
  const providerId = asParam(req.params.id);

  await prisma.serviceProvider.findFirstOrThrow({
    where: { id: providerId, deletedAt: null },
    select: { id: true },
  });

  const links = await prisma.opportunityServiceProvider.findMany({
    where: { serviceProviderId: providerId },
    include: {
      constructionOpportunity: {
        select: {
          id: true,
          code: true,
          title: true,
          city: true,
          status: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  res.json(
    links.map((link) => ({
      id: link.id,
      role: link.role,
      createdAt: link.createdAt,
      opportunity: link.constructionOpportunity,
    })),
  );
});

serviceProvidersRouter.put("/:id/opportunities", async (req, res) => {
  const providerId = asParam(req.params.id);
  const payload = bindOpportunitiesSchema.parse(req.body);

  await prisma.serviceProvider.findFirstOrThrow({
    where: { id: providerId, deletedAt: null },
    select: { id: true },
  });

  const uniqueOpportunityIds = [...new Set(payload.opportunityIds)];

  if (uniqueOpportunityIds.length > 0) {
    const existingOpportunities = await prisma.constructionOpportunity.findMany({
      where: {
        id: { in: uniqueOpportunityIds },
        isDeleted: false,
      },
      select: { id: true },
    });

    const foundSet = new Set(existingOpportunities.map((item) => item.id));
    const invalidIds = uniqueOpportunityIds.filter((id) => !foundSet.has(id));
    if (invalidIds.length > 0) {
      res.status(422).json({ message: "Obra(s) inválida(s)", invalidIds });
      return;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.opportunityServiceProvider.deleteMany({
      where: { serviceProviderId: providerId },
    });

    if (uniqueOpportunityIds.length === 0) return;

    await tx.opportunityServiceProvider.createMany({
      data: uniqueOpportunityIds.map((constructionOpportunityId) => ({
        constructionOpportunityId,
        serviceProviderId: providerId,
      })),
    });
  });

  const links = await prisma.opportunityServiceProvider.findMany({
    where: { serviceProviderId: providerId },
    include: {
      constructionOpportunity: {
        select: {
          id: true,
          code: true,
          title: true,
          city: true,
          status: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  res.json(
    links.map((link) => ({
      id: link.id,
      role: link.role,
      createdAt: link.createdAt,
      opportunity: link.constructionOpportunity,
    })),
  );
});
