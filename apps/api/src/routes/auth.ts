import { Router } from 'express'
import { createUser, findUserByIdentifier, getUserById, listUsers } from '../data/users.js'
import { HttpError } from '../errors.js'
import { requireAdmin, requireAuth } from '../middleware.js'

/**
 * Auth module. Mounted at /api, so paths here are the contract's paths verbatim
 * (/auth/users, /auth/signin, /me, /devotees, /users).
 */
export const authRouter = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MOBILE_RE = /^\d{10}$/

/**
 * Validation failures carry an optional `field` alongside the contract's
 * `code` and `message`, so a form can attach the message to the right input
 * (DESIGN.md section 8). Clients that ignore it still get the standard shape.
 */
class FieldError extends HttpError {
  field: string

  constructor(status: number, code: string, message: string, field: string) {
    super(status, code, message)
    this.field = field
  }
}

function validateNewUser(body: Record<string, unknown>): {
  name: string
  mobile?: string
  email?: string
} {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (name.length < 2) {
    throw new FieldError(400, 'INVALID_NAME', 'Enter your full name (at least 2 characters).', 'name')
  }

  const mobile = typeof body.mobile === 'string' ? body.mobile.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''

  if (!mobile && !email) {
    throw new FieldError(
      400,
      'CONTACT_REQUIRED',
      'Enter a mobile number or an email address so we can identify you.',
      'mobile',
    )
  }
  if (mobile && !MOBILE_RE.test(mobile.replace(/[\s\-+()]/g, '').slice(-10))) {
    throw new FieldError(400, 'INVALID_MOBILE', 'Enter a 10-digit mobile number.', 'mobile')
  }
  if (email && !EMAIL_RE.test(email)) {
    throw new FieldError(
      400,
      'INVALID_EMAIL',
      'Enter a valid email address, like name@example.org.',
      'email',
    )
  }

  return { name, ...(mobile ? { mobile } : {}), ...(email ? { email } : {}) }
}

/**
 * The account picker for simulated sign-in. Deliberately unauthenticated: it is
 * what the client reads *before* anyone has signed in.
 */
authRouter.get('/auth/users', async (_req, res) => {
  res.json({ simulated: true, users: await listUsers() })
})

authRouter.post('/auth/signin', async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : ''

  if (!userId && !identifier) {
    throw new FieldError(
      400,
      'IDENTIFIER_REQUIRED',
      'Choose an account, or enter your registered mobile number or email address.',
      'identifier',
    )
  }

  const user = userId ? await getUserById(userId) : await findUserByIdentifier(identifier)
  if (!user) {
    throw new FieldError(
      404,
      'USER_NOT_FOUND',
      'No account matches that mobile number or email. Check it, or register instead.',
      'identifier',
    )
  }
  if (user.status !== 'active') {
    throw new HttpError(
      403,
      'ACCOUNT_INACTIVE',
      'This account is no longer active. Please contact the temple office.',
    )
  }

  // No token is issued: the client simply sends this id back as x-user-id.
  res.json({ user })
})

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

/**
 * Resolves CONTRACT.md open decision 5 — the PRD's screen list includes
 * Register, so devotees can create their own account.
 */
authRouter.post('/users', async (req, res) => {
  const input = validateNewUser((req.body ?? {}) as Record<string, unknown>)

  for (const [field, value] of [
    ['mobile', input.mobile],
    ['email', input.email],
  ] as const) {
    if (value && (await findUserByIdentifier(value))) {
      throw new FieldError(
        409,
        'ALREADY_REGISTERED',
        `That ${field === 'mobile' ? 'mobile number' : 'email address'} is already registered. Sign in instead.`,
        field,
      )
    }
  }

  res.status(201).json({ user: await createUser(input) })
})

authRouter.get('/devotees', requireAdmin, async (_req, res) => {
  res.json({ users: await listUsers('devotee') })
})
