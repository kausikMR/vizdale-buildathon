import type { NextFunction, Request, Response } from 'express'

/**
 * Every failure leaves the API in exactly one shape (CONTRACT.md section 5):
 *
 *   { "error": { "code": "…", "message": "…" } }
 *
 * The message is written for a devotee to read (EXP-01) — clients render it
 * directly rather than substituting their own wording.
 */
export class HttpError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
  }
}

/** Postgres raises these when a CHECK or UNIQUE constraint catches what app code missed. */
const PG_CHECK_VIOLATION = '23514'
const PG_UNIQUE_VIOLATION = '23505'

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    // `field` is an optional addition for inline form errors; the code/message
    // pair is always present, so clients that ignore it see the standard shape.
    const field = (err as HttpError & { field?: string }).field
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(field ? { field } : {}) },
    })
    return
  }

  const pgCode = (err as { code?: string } | null)?.code
  if (pgCode === PG_CHECK_VIOLATION || pgCode === PG_UNIQUE_VIOLATION) {
    res.status(409).json({
      error: {
        code: 'CONSTRAINT_VIOLATION',
        message: 'That change would break a temple record rule. Please review the details and try again.',
      },
    })
    return
  }

  console.error('Unhandled error:', err)
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our side. Nothing was saved — please try again.',
    },
  })
}
