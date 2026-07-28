import fs from "node:fs";
import path from "node:path";
import { env } from "../../config/env.js";

export type SqlDialectMode = "sqlite" | "mssql";

const breakerFilePath = () =>
  process.env.SQL_DIALECT_BREAKER_FILE?.trim() ||
  path.resolve(process.cwd(), "data", "sql-dialect.breaker");

let memoryOverride: SqlDialectMode | null = null;

const normalize = (value: string | undefined | null): SqlDialectMode | null => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "sqlite" || normalized === "mssql") return normalized;
  return null;
};

const readFileOverride = (): SqlDialectMode | null => {
  try {
    const raw = fs.readFileSync(breakerFilePath(), "utf-8");
    return normalize(raw.split(/\r?\n/)[0]);
  } catch {
    return null;
  }
};

/**
 * Circuit breaker do dialecto de obras (v2).
 * Prioridade: memoria > arquivo data/sql-dialect.breaker > SQL_DIALECT do .env
 *
 * Permite voltar para SQLite (ou reativar mssql) sem rebuild/redeploy de imagem.
 * Observacao: dados gravados so no dialecto ativo nao aparecem no outro ate nova carga.
 */
export const getActiveSqlDialect = (): SqlDialectMode => {
  return memoryOverride ?? readFileOverride() ?? normalize(env.sqlDialect) ?? "sqlite";
};

export const getSqlDialectCircuitStatus = () => {
  const fileOverride = readFileOverride();
  return {
    active: getActiveSqlDialect(),
    envDefault: normalize(env.sqlDialect) ?? "sqlite",
    fileOverride,
    memoryOverride,
    breakerFile: breakerFilePath(),
  };
};

export const setActiveSqlDialect = (dialect: SqlDialectMode, reason?: string) => {
  const next = normalize(dialect);
  if (!next) {
    throw new Error(`Dialect invalido: ${dialect}`);
  }

  memoryOverride = next;

  const file = breakerFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const payload = [
    next,
    `# updatedAt=${new Date().toISOString()}`,
    reason ? `# reason=${reason.replace(/\r?\n/g, " ").slice(0, 200)}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
  fs.writeFileSync(file, `${payload}\n`, "utf-8");

  console.warn(`[circuit-breaker] SQL dialect -> ${next}${reason ? ` (${reason})` : ""}`);
  return getSqlDialectCircuitStatus();
};

export const clearSqlDialectCircuitOverride = () => {
  memoryOverride = null;
  try {
    fs.unlinkSync(breakerFilePath());
  } catch {
    // arquivo pode nao existir
  }
  console.warn("[circuit-breaker] override removido; voltando ao SQL_DIALECT do env");
  return getSqlDialectCircuitStatus();
};
