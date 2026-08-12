import type { ErrorRequestHandler } from "express";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

function postgresErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  return typeof error.code === "string" ? error.code : undefined;
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (
    error instanceof SyntaxError &&
    "status" in error &&
    (error as SyntaxError & { status?: number }).status === 400
  ) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "The request body is not valid JSON. Correct it and try again.",
      },
    });
    return;
  }

  if (["23505", "23514", "22P02"].includes(postgresErrorCode(error) ?? "")) {
    res.status(409).json({
      error: {
        code: "CONSTRAINT_VIOLATION",
        message: "That change conflicts with a database rule. Review the values and try again.",
      },
    });
    return;
  }

  console.error("Unexpected API error", error);
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Nothing was saved because the service encountered an unexpected error. Please try again.",
    },
  });
};
