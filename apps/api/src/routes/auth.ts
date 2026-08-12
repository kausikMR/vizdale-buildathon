import { Router } from 'express'
import { MIN_PASSWORD_LENGTH, decoyHash, hashPassword, verifyPassword } from '../auth/password.js'
import { createSession, deleteSession } from '../data/sessions.js'
import {
  createUser,
  findCredentialsByIdentifier,
  findUserByIdentifier,
  listUsers,
} from '../data/users.js'
import { HttpError } from '../errors.js'
import { requireAdmin, requireAuth } from '../middleware.js'

/**
 * Auth module. Mounted at /api.
 *
 * Sign-in verifies a password and issues a bearer session token. The
 * unauthenticated GET /auth/users account picker from CONTRACT.md has been
 * removed: publishing the full account list is an enumeration vector, and it
 * only existed to support one-click sign-in, which real credentials replace.
 */
export const authRouter = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MOBILE_RE = /^\d{10}$/

class FieldError extends HttpError {
  field: string

  constructor(status: number, code: string, message: string, field: string) {
    super(status, code, message)
    this.field = field
  }
}

function requireString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function validateRegistration(body: Record<string, unknown>): {
  name: string
  mobile?: string
  email?: string
  password: string
} {
  const name = requireString(body.name)
  if (name.length < 2) {
    throw new FieldError(400, 'INVALID_NAME', 'Enter your full name (at least 2 characters).', 'name')
  }

  const mobile = requireString(body.mobile)
  const email = requireString(body.email)

  if (!mobile && !email) {
    throw new FieldError(
      400,
      'CONTACT_REQUIRED',
      'Enter a mobile number or an email address — you will sign in with it.',
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

  // Not trimmed: leading and trailing spaces are legitimate password characters.
  const password = typeof body.password === 'string' ? body.password : ''
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new FieldError(
      400,
      'PASSWORD_TOO_SHORT',
      `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
      'password',
    )
  }

  return { name, ...(mobile ? { mobile } : {}), ...(email ? { email } : {}), password }
}

authRouter.post('/auth/signin', async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const identifier = requireString(body.identifier)
  const password = typeof body.password === 'string' ? body.password : ''

  if (!identifier) {
    throw new FieldError(
      400,
      'IDENTIFIER_REQUIRED',
      'Enter your registered mobile number or email address.',
      'identifier',
    )
  }
  if (!password) {
    throw new FieldError(400, 'PASSWORD_REQUIRED', 'Enter your password.', 'password')
  }

  const found = await findCredentialsByIdentifier(identifier)

  // Always run the full hash, falling back to a decoy when no account matched
  // or the account has no password set. Skipping the work would return in a
  // fraction of the time and turn sign-in into an account-existence oracle.
  const ok = await verifyPassword(password, found?.passwordHash ?? (await decoyHash()))
  if (!found || !ok) {
    throw new HttpError(
      401,
      'INVALID_CREDENTIALS',
      'That mobile number, email or password is incorrect. Please check and try again.',
    )
  }

  if (found.user.status !== 'active') {
    throw new HttpError(
      403,
      'ACCOUNT_INACTIVE',
      'This account is no longer active. Please contact the temple office.',
    )
  }

  const session = await createSession(found.user.id)
  res.json({ ...session, user: found.user })
})

authRouter.post('/auth/signout', requireAuth, async (req, res) => {
  const token = req.header('authorization')?.split(' ')[1]
  if (token) await deleteSession(token)
  res.json({ ok: true })
})

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

/** Registration: creates a devotee and signs them straight in. */
authRouter.post('/users', async (req, res) => {
  const input = validateRegistration((req.body ?? {}) as Record<string, unknown>)

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

  const user = await createUser({
    name: input.name,
    mobile: input.mobile,
    email: input.email,
    passwordHash: await hashPassword(input.password),
  })

  const session = await createSession(user.id)
  res.status(201).json({ ...session, user })
})

authRouter.get('/devotees', requireAdmin, async (_req, res) => {
  res.json({ users: await listUsers('devotee') })
})
