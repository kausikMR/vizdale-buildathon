import type { NextFunction, Request, Response } from 'express'
import { findSessionUser } from './data/sessions.js'
import { HttpError } from './errors.js'
import type { User } from './types.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

/**
 * Session authentication.
 *
 *   Authorization: Bearer <token>
 *
 * The token is issued by POST /auth/signin only after a password has been
 * verified. This deliberately replaces the x-user-id header from CONTRACT.md
 * section 5: while a caller could name any user id, a password could always be
 * bypassed, so the two cannot coexist.
 */
function readToken(req: Request): string | undefined {
  const header = req.header('authorization')
  if (!header) return undefined
  const [scheme, token] = header.split(' ')
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined
}

export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = readToken(req)
  if (token) {
    const user = await findSessionUser(token)
    if (user) req.user = user
  }
  next()
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new HttpError(403, 'NOT_SIGNED_IN', 'Please sign in to continue.')
  }
  if (req.user.status !== 'active') {
    throw new HttpError(
      403,
      'ACCOUNT_INACTIVE',
      'This account is no longer active. Please contact the temple office.',
    )
  }
  next()
}

/**
 * AUTH-02. Hiding admin navigation in the UI is cosmetic — this is the actual
 * gate. A devotee cannot reach admin data by editing the frontend.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user!.role !== 'admin') {
      throw new HttpError(
        403,
        'ADMIN_ONLY',
        'This area is only available to temple administrators.',
      )
    }
    next()
  })
}
