import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../shared/errors/app-error.js";
import {
  clearSqlDialectCircuitOverride,
  getSqlDialectCircuitStatus,
  setActiveSqlDialect,
  type SqlDialectMode,
} from "../../shared/database/sql-dialect-circuit-breaker.js";

/**
 * Ops endpoints para circuit breaker do dialecto SQLite <-> MSSQL.
 * Protegido por header: Authorization: Bearer <CIRCUIT_BREAKER_TOKEN>
 * ou X-Circuit-Breaker-Token: <CIRCUIT_BREAKER_TOKEN>
 */
export const dbCircuitBreakerRouter = Router();

const stripQuotes = (value: string) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const requireBreakerToken = (req: { header: (name: string) => string | undefined }) => {
  const expectedRaw = process.env.CIRCUIT_BREAKER_TOKEN;
  const expected = expectedRaw ? stripQuotes(expectedRaw) : "";
  if (!expected) {
    throw new AppError(
      "Circuit breaker desabilitado. Defina CIRCUIT_BREAKER_TOKEN no ambiente.",
      503,
    );
  }

  const auth = req.header("authorization") ?? "";
  const bearerMatch = auth.match(/^Bearer\s+(.+)$/i);
  const bearer = bearerMatch?.[1] ? stripQuotes(bearerMatch[1]) : null;
  const headerTokenRaw = req.header("x-circuit-breaker-token");
  const headerToken = headerTokenRaw ? stripQuotes(headerTokenRaw) : null;
  const provided = bearer || headerToken;

  if (!provided || provided !== expected) {
    throw new AppError(
      "Token do circuit breaker invalido. Use Authorization: Bearer <CIRCUIT_BREAKER_TOKEN> (no PowerShell prefira curl.exe).",
      401,
    );
  }
};

dbCircuitBreakerRouter.get("/db-circuit", (req, res) => {
  requireBreakerToken(req);
  res.json(getSqlDialectCircuitStatus());
});

dbCircuitBreakerRouter.post("/db-circuit", (req, res) => {
  requireBreakerToken(req);

  const payload = z
    .object({
      dialect: z.enum(["sqlite", "mssql"]),
      reason: z.string().trim().max(200).optional(),
    })
    .parse(req.body);

  const status = setActiveSqlDialect(payload.dialect as SqlDialectMode, payload.reason);
  res.json({
    message: `Dialect ativo: ${status.active}`,
    ...status,
  });
});

dbCircuitBreakerRouter.delete("/db-circuit", (req, res) => {
  requireBreakerToken(req);
  const status = clearSqlDialectCircuitOverride();
  res.json({
    message: `Override removido. Dialect ativo: ${status.active}`,
    ...status,
  });
});
