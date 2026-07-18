import { Router } from "express";
import { Connection, Request, TYPES } from "tedious";
import { z } from "zod";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/app-error.js";

type ErpFlexAuthRow = {
  Autorizado?: string | null;
  ID_Usuario?: number | null;
  Nome?: string | null;
  Email?: string | null;
};

type TediousColumn = {
  metadata: {
    colName: string;
  };
  value: unknown;
};

const erpFlexLoginSchema = z.object({
  username: z.string().trim().min(1, "Informe o usuário."),
  password: z.string().min(1, "Informe a senha."),
});

const mapTediousRow = (columns: TediousColumn[]): ErpFlexAuthRow => {
  const row: Record<string, unknown> = {};

  for (const column of columns) {
    row[column.metadata.colName] = column.value;
  }

  return row as ErpFlexAuthRow;
};

const executeErpFlexLogin = async (username: string, password: string): Promise<ErpFlexAuthRow[]> => {
  if (!env.erpFlexSqlPassword) {
    throw new AppError("ERP Flex SQL password is not configured.", 503);
  }

  return new Promise<ErpFlexAuthRow[]>((resolve, reject) => {
    const rows: ErpFlexAuthRow[] = [];
    let settled = false;

    const connection = new Connection({
      server: env.erpFlexSqlHost,
      authentication: {
        type: "default",
        options: {
          userName: env.erpFlexSqlUsername,
          password: env.erpFlexSqlPassword,
        },
      },
      options: {
        port: env.erpFlexSqlPort,
        database: env.erpFlexSqlDatabase,
        encrypt: env.erpFlexSqlEncrypt,
        trustServerCertificate: env.erpFlexSqlTrustServerCertificate,
        rowCollectionOnDone: false,
        rowCollectionOnRequestCompletion: false,
      },
    });

    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;

      try {
        connection.close();
      } catch {
        // Connection may already be closed or never fully opened.
      }

      callback();
    };

    connection.on("connect", (error) => {
      if (error) {
        settle(() => reject(new AppError("ERP Flex authentication unavailable.", 503, error.message)));
        return;
      }

      const request = new Request(env.erpFlexLoginProcedure, (requestError) => {
        if (requestError) {
          settle(() => reject(new AppError("ERP Flex authentication failed.", 503, requestError.message)));
          return;
        }

        settle(() => resolve(rows));
      });

      request.addParameter("NomeUsuario", TYPES.VarChar, username);
      request.addParameter("Senha", TYPES.VarChar, password);
      request.on("row", (columns) => {
        rows.push(mapTediousRow(columns as TediousColumn[]));
      });

      connection.callProcedure(request);
    });

    connection.on("error", (error) => {
      settle(() => reject(new AppError("ERP Flex authentication unavailable.", 503, error.message)));
    });

    connection.connect();
  });
};

export const erpFlexAuthRouter = Router();

erpFlexAuthRouter.post("/erp-flex", async (req, res, next) => {
  try {
    const payload = erpFlexLoginSchema.parse(req.body);
    const rows = await executeErpFlexLogin(payload.username, payload.password);
    const authorizedRow = rows.find((row) => row.Autorizado?.trim().toUpperCase() === "S");

    if (!authorizedRow) {
      throw new AppError("Usuário ou senha ERP Flex inválidos.", 401);
    }

    const user = {
      id: Number(authorizedRow.ID_Usuario ?? 0),
      username: payload.username,
      name: String(authorizedRow.Nome ?? payload.username).trim() || payload.username,
      email: authorizedRow.Email ? String(authorizedRow.Email).trim() : null,
    };

    const token = Buffer.from(`${user.username}:${user.id}:${Date.now()}`).toString("base64");

    res.json({ token, user });
  } catch (error) {
    next(error);
  }
});