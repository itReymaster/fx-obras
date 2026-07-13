import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/shared/database/prisma.js";

describe("construction opportunities API", () => {
  beforeEach(async () => {
    await prisma.constructionOpportunityHistory.deleteMany();
    await prisma.constructionOpportunityPhoto.deleteMany();
    await prisma.constructionOpportunity.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates an opportunity", async () => {
    const response = await request(app).post("/api/v1/construction-opportunities").send({
      title: "Obra Teste",
      street: "Rua A",
      city: "Curitiba",
      state: "PR",
      withoutNumber: true,
      addressSource: "MANUAL",
    });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeTruthy();
    expect(response.body.code).toMatch(/^OBR-/);
  });

  it("validates location minimum fields", async () => {
    const response = await request(app).post("/api/v1/construction-opportunities").send({
      title: "Sem Local",
    });
    expect(response.status).toBe(422);
  });

  it("supports GPS capture payload", async () => {
    const response = await request(app).post("/api/v1/construction-opportunities").send({
      title: "GPS",
      addressSource: "GPS",
      latitude: -25.42,
      longitude: -49.27,
      locationAccuracy: 12.5,
    });

    expect(response.status).toBe(201);
    expect(response.body.latitude).toBe(-25.42);
  });

  it("supports manual address payload", async () => {
    const response = await request(app).post("/api/v1/construction-opportunities").send({
      title: "Manual",
      addressSource: "MANUAL",
      district: "Centro",
      city: "Curitiba",
      state: "PR",
    });

    expect(response.status).toBe(201);
    expect(response.body.addressSource).toBe("MANUAL");
  });

  it("uploads photo and sets primary", async () => {
    const created = await request(app).post("/api/v1/construction-opportunities").send({
      title: "Com Foto",
      street: "Rua A",
      city: "Curitiba",
      state: "PR",
      addressSource: "MANUAL",
    });

    const upload = await request(app)
      .post(`/api/v1/construction-opportunities/${created.body.id}/photos`)
      .attach("photos", Buffer.from([1, 2, 3]), "photo.jpg");

    expect(upload.status).toBe(201);
    expect(upload.body[0].id).toBeTruthy();

    const setPrimary = await request(app).patch(
      `/api/v1/construction-opportunities/${created.body.id}/photos/${upload.body[0].id}/primary`,
    );
    expect(setPrimary.status).toBe(204);
  });

  it("lists opportunities with filters", async () => {
    await request(app).post("/api/v1/construction-opportunities").send({
      title: "Filtro Centro",
      district: "Centro",
      city: "Curitiba",
      state: "PR",
      addressSource: "MANUAL",
    });

    const response = await request(app).get(
      "/api/v1/construction-opportunities?city=Curitiba&status=CAPTURED&page=1&pageSize=20",
    );

    expect(response.status).toBe(200);
    expect(response.body.pagination.totalItems).toBeGreaterThan(0);
  });

  it("gets complete opportunity details", async () => {
    const created = await request(app).post("/api/v1/construction-opportunities").send({
      title: "Detalhada",
      street: "Rua B",
      city: "Curitiba",
      state: "PR",
      addressSource: "MANUAL",
    });

    const response = await request(app).get(
      `/api/v1/construction-opportunities/${created.body.id}`,
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.photos)).toBe(true);
    expect(Array.isArray(response.body.history)).toBe(true);
  });

  it("returns export payload", async () => {
    const created = await request(app).post("/api/v1/construction-opportunities").send({
      title: "Exportavel",
      street: "Rua C",
      city: "Curitiba",
      state: "PR",
      addressSource: "MANUAL",
    });

    const response = await request(app).get(
      `/api/v1/construction-opportunities/${created.body.id}/export`,
    );

    expect(response.status).toBe(200);
    expect(response.body.schemaVersion).toBe("1.0");
    expect(response.body.sourceSystem).toBe("OBRAS_PROSPECT");
  });

  it("changes status", async () => {
    const created = await request(app).post("/api/v1/construction-opportunities").send({
      title: "Status",
      street: "Rua D",
      city: "Curitiba",
      state: "PR",
      addressSource: "MANUAL",
    });

    const response = await request(app)
      .patch(`/api/v1/construction-opportunities/${created.body.id}/status`)
      .send({ status: "SENT_TO_PROSPECTING", reason: "Validado" });

    expect(response.status).toBe(204);
  });

  it("soft deletes opportunity", async () => {
    const created = await request(app).post("/api/v1/construction-opportunities").send({
      title: "Delete",
      street: "Rua E",
      city: "Curitiba",
      state: "PR",
      addressSource: "MANUAL",
    });

    const removed = await request(app).delete(
      `/api/v1/construction-opportunities/${created.body.id}`,
    );
    expect(removed.status).toBe(204);

    const detail = await request(app).get(
      `/api/v1/construction-opportunities/${created.body.id}`,
    );
    expect(detail.status).toBe(404);
  });
});
