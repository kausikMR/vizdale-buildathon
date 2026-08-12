import type { NextFunction, Request, Response } from 'express'
import { getSession, getUser } from './store.js'
import type { User, UserRole } from './types.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

function readToken(req: Request): string | undefined {
  const header = req.header('authorization')
  if (!header) return undefined
  const [scheme, token] = header.split(' ')
  return scheme?.toLowerCase() === 'bearer' ? token : undefined
}

/** Attaches req.user when a valid session token is present. Never rejects. */
export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  const token = readToken(req)
  if (token) {
    const session = getSession(token)
    if (session) req.user = getUser(session.userId)
  }
  next()
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: { code: 'NOT_SIGNED_IN', message: 'Please sign in to continue.' },
    })
    return
  }
  next()
}

/**
 * Server-side half of AUTH-02. Hiding admin routes in the UI is not enough —
 * a devotee token must be rejected here too.
 */
export function requireRole(role: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: { code: 'NOT_SIGNED_IN', message: 'Please sign in to continue.' },
      })
      return
    }
    if (req.user.role !== role) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'This area is only available to temple administrators.',
        },
      })
      return
    }
    next()
  }
}
