import { Router } from "express";
import { Connection, Request, TYPES } from "tedious";
import { z } from "zod";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/app-error.js";
const erpFlexLoginSchema = z.object({
    username: z.string().trim().min(1, "Informe o usuário."),
    password: z.string().min(1, "Informe a senha."),
});
const mapTediousRow = (columns) => {
    const row = {};
    for (const column of columns) {
        row[column.metadata.colName] = column.value;
    }
    return row;
};
const executeErpFlexLogin = async (username, password) => {
    if (!env.erpFlexSqlPassword) {
        throw new AppError("ERP Flex SQL password is not configured.", 503);
    }
    return new Promise((resolve, reject) => {
        const rows = [];
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
        const settle = (callback) => {
            if (settled)
                return;
            settled = true;
            try {
                connection.close();
            }
            catch {
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
                rows.push(mapTediousRow(columns));
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
erpFlexAuthRouter.get("/erp-flex/status", (_req, res) => {
    res.json({
        configured: Boolean(env.erpFlexSqlPassword),
        host: env.erpFlexSqlHost,
        port: env.erpFlexSqlPort,
        database: env.erpFlexSqlDatabase,
        username: env.erpFlexSqlUsername,
        procedure: env.erpFlexLoginProcedure,
    });
});
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
    }
    catch (error) {
        next(error);
    }
});
