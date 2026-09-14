import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/shared/database/prisma.js";

const authHeader = `Bearer ${Buffer.from("testuser:pass").toString("base64")}`;

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
    const response = await request(app)
      .post("/api/v1/construction-opportunities")
      .set("Authorization", authHeader)
      .send({
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
    const response = await request(app)
      .post("/api/v1/construction-opportunities")
      .set("Authorization", authHeader)
      .send({
        title: "Sem Local",
      });
    expect(response.status).toBe(422);
  });

  it("supports GPS capture payload", async () => {
    const response = await request(app)
      .post("/api/v1/construction-opportunities")
      .set("Authorization", authHeader)
      .send({
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
    const response = await request(app)
      .post("/api/v1/construction-opportunities")
      .set("Authorization", authHeader)
      .send({
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
    const created = await request(app)
      .post("/api/v1/construction-opportunities")
      .set("Authorization", authHeader)
      .send({
        title: "Com Foto",
        street: "Rua A",
        city: "Curitiba",
        state: "PR",
        addressSource: "MANUAL",
      });

    const upload = await request(app)
      .post(`/api/v1/construction-opportunities/${created.body.id}/photos`)
      .set("Authorization", authHeader)
      .attach("photos", Buffer.from([1, 2, 3]), "photo.jpg");

    expect(upload.status).toBe(201);
    expect(upload.body[0].id).toBeTruthy();

    const setPrimary = await request(app)
      .patch(
        `/api/v1/construction-opportunities/${created.body.id}/photos/${upload.body[0].id}/primary`,
      )
      .set("Authorization", authHeader);
    expect(setPrimary.status).toBe(204);
  });

  it("lists opportunities with filters", async () => {
    await request(app)
      .post("/api/v1/construction-opportunities")
      .set("Authorization", authHeader)
      .send({
        title: "Filtro Centro",
        district: "Centro",
        city: "Curitiba",
        state: "PR",
        addressSource: "MANUAL",
      });

    const response = await request(app)
      .get(
        "/api/v1/construction-opportunities?city=Curitiba&district=Centro&status=CAPTURED&page=1&pageSize=20",
      )
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    expect(response.body.pagination.totalItems).toBeGreaterThan(0);
    expect(response.body.data[0].district).toBe("Centro");
  });

  it("returns distinct locations for cascading filters", async () => {
    await request(app)
      .post("/api/v1/construction-opportunities")
      .set("Authorization", authHeader)
      .send({
        title: "Obra 1",
        district: "Batel",
        city: "Curitiba",
        state: "PR",
        addressSource: "MANUAL",
      });
    await request(app)
      .post("/api/v1/construction-opportunities")
      .set("Authorization", authHeader)
      .send({
        title: "Obra 2",
        district: "Centro",
        city: "Joinville",
        state: "SC",
        addressSource: "MANUAL",
      });

    const response = await request(app)
      .get("/api/v1/construction-opportunities/locations")
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.some((l: any) => l.city === "Curitiba" && l.state === "PR" && l.district === "Batel")).toBe(true);
    expect(response.body.some((l: any) => l.city === "Joinville" && l.state === "SC" && l.district === "Centro")).toBe(true);
  });

  it("filters opportunities by district with partial match", async () => {
    await request(app)
      .post("/api/v1/construction-opportunities")
      .set("Authorization", authHeader)
      .send({
        title: "Obra no Batel",
        district: "Batel",
        city: "Curitiba",
        state: "PR",
        addressSource: "MANUAL",
      });
    await request(app)
      .post("/api/v1/construction-opportunities")
      .set("Authorization", authHeader)
      .send({
        title: "Obra no Portão",
        district: "Portão",
        city: "Curitiba",
        state: "PR",
        addressSource: "MANUAL",
      });

    const response = await request(app)
      .get(
        "/api/v1/construction-opportunities?district=Bat&page=1&pageSize=20",
      )
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    expect(response.body.pagination.totalItems).toBe(1);
    expect(response.body.data[0].district).toBe("Batel");
  });

  it("gets complete opportunity details", async () => {
    const created = await request(app)
      .post("/api/v1/construction-opportunities")
      .set("Authorization", authHeader)
      .send({
        title: "Detalhada",
        street: "Rua B",
        city: "Curitiba",
        state: "PR",
        addressSource: "MANUAL",
      });

    const response = await request(app)
      .get(`/api/v1/construction-opportunities/${created.body.id}`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.photos)).toBe(true);
    expect(Array.isArray(response.body.history)).toBe(true);
  });

  it("returns export payload", async () => {
    const created = await request(app)
      .post("/api/v1/construction-opportunities")
      .set("Authorization", authHeader)
      .send({
        title: "Exportavel",
        street: "Rua C",
        city: "Curitiba",
        state: "PR",
        addressSource: "MANUAL",
      });

    const response = await request(app)
      .get(`/api/v1/construction-opportunities/${created.body.id}/export`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    expect(response.body.schemaVersion).toBe("1.0");
    expect(response.body.sourceSystem).toBe("OBRAS_PROSPECT");
  });

  it("changes status", async () => {
    const created = await request(app)
      .post("/api/v1/construction-opportunities")
      .set("Authorization", authHeader)
      .send({
        title: "Status",
        street: "Rua D",
        city: "Curitiba",
        state: "PR",
        addressSource: "MANUAL",
      });

    const response = await request(app)
      .patch(`/api/v1/construction-opportunities/${created.body.id}/status`)
      .set("Authorization", authHeader)
      .send({ status: "SENT_TO_PROSPECTING", reason: "Validado" });

    expect(response.status).toBe(204);
  });

  it("soft deletes opportunity", async () => {
    const created = await request(app)
      .post("/api/v1/construction-opportunities")
      .set("Authorization", authHeader)
      .send({
        title: "Delete",
        street: "Rua E",
        city: "Curitiba",
        state: "PR",
        addressSource: "MANUAL",
      });

    const removed = await request(app)
      .delete(`/api/v1/construction-opportunities/${created.body.id}`)
      .set("Authorization", authHeader);
    expect(removed.status).toBe(204);

    const detail = await request(app)
      .get(`/api/v1/construction-opportunities/${created.body.id}`)
      .set("Authorization", authHeader);
    expect(detail.status).toBe(404);
  });
});
