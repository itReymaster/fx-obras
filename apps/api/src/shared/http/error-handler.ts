import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
  }

  if (error instanceof ZodError) {
    return res.status(422).json({
      message: "Validation error",
      details: error.flatten(),
    });
  }

  console.error("[api] unhandled error:", error);
  const anyErr = error as any;
  return res.status(500).json({
    message: "Internal server error",
    debug: {
      name: anyErr?.name ?? null,
      message: anyErr?.message ?? null,
      code: anyErr?.code ?? null,
      stack: typeof anyErr?.stack === "string" ? anyErr.stack.split("\n").slice(0, 5) : null,
    },
  });
};
