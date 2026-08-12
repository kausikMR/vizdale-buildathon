import type { NextFunction, Request, Response } from 'express'
import { getUserById } from './data/users.js'
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
 * Simulated authentication (CONTRACT.md section 5). The client sends the chosen
 * seeded user's id and the server looks up the role itself:
 *
 *   x-user-id: 11111111-1111-1111-1111-111111111111
 *
 * There are no passwords and no tokens. USR-01 depends on the identity being
 * resolved here rather than from a query parameter a client could change.
 */
export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const id = req.header('x-user-id')
  if (id) {
    const user = await getUserById(id)
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
