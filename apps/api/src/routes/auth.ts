import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware.js'
import {
  createSession,
  createUser,
  deleteSession,
  findUserByIdentifier,
  listUsers,
  updateUser,
} from '../store.js'

export const authRouter = Router()

type FieldError = { code: string; message: string; field?: string }

function fail(res: import('express').Response, status: number, error: FieldError) {
  res.status(status).json({ error })
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MOBILE_RE = /^\d{10}$/

/**
 * Shared validation for register and profile update. Returns the cleaned
 * contact fields, or the first problem found. Messages are written to be
 * actionable (EXP-01) rather than merely correct.
 */
function validateContact(input: { name?: unknown; mobile?: unknown; email?: unknown }):
  | { ok: true; value: { name: string; mobile?: string; email?: string } }
  | { ok: false; error: FieldError } {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (name.length < 2) {
    return {
      ok: false,
      error: { code: 'INVALID_NAME', message: 'Enter your full name (at least 2 characters).', field: 'name' },
    }
  }

  const mobile = typeof input.mobile === 'string' ? input.mobile.trim() : ''
  const email = typeof input.email === 'string' ? input.email.trim() : ''

  if (!mobile && !email) {
    return {
      ok: false,
      error: {
        code: 'CONTACT_REQUIRED',
        message: 'Enter a mobile number or an email address so we can identify you.',
        field: 'mobile',
      },
    }
  }
  if (mobile && !MOBILE_RE.test(mobile.replace(/[\s\-+()]/g, '').slice(-10))) {
    return {
      ok: false,
      error: { code: 'INVALID_MOBILE', message: 'Enter a 10-digit mobile number.', field: 'mobile' },
    }
  }
  if (email && !EMAIL_RE.test(email)) {
    return {
      ok: false,
      error: { code: 'INVALID_EMAIL', message: 'Enter a valid email address, like name@example.org.', field: 'email' },
    }
  }

  return {
    ok: true,
    value: { name, ...(mobile ? { mobile } : {}), ...(email ? { email } : {}) },
  }
}

/**
 * Seeded accounts offered as one-tap sign-in. Simulated only — this endpoint
 * would not exist against a real identity provider.
 */
authRouter.get('/demo-accounts', (_req, res) => {
  res.json({
    simulated: true,
    users: listUsers().map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      status: u.status,
      identifier: u.mobile ?? u.email,
    })),
  })
})

authRouter.post('/signin', (req, res) => {
  const identifier = typeof req.body?.identifier === 'string' ? req.body.identifier.trim() : ''
  if (!identifier) {
    return fail(res, 400, {
      code: 'IDENTIFIER_REQUIRED',
      message: 'Enter your registered mobile number or email address.',
      field: 'identifier',
    })
  }

  const user = findUserByIdentifier(identifier)
  if (!user) {
    return fail(res, 404, {
      code: 'USER_NOT_FOUND',
      message: 'No account matches that mobile number or email. Check it, or register instead.',
      field: 'identifier',
    })
  }
  if (user.status === 'suspended') {
    return fail(res, 403, {
      code: 'ACCOUNT_SUSPENDED',
      message: 'This account is suspended. Please contact the temple office.',
    })
  }

  const session = createSession(user.id)
  res.json({ token: session.token, user })
})

authRouter.post('/register', (req, res) => {
  const validated = validateContact(req.body ?? {})
  if (!validated.ok) return fail(res, 400, validated.error)

  const { name, mobile, email } = validated.value

  for (const [field, value] of [
    ['mobile', mobile],
    ['email', email],
  ] as const) {
    if (value && findUserByIdentifier(value)) {
      return fail(res, 409, {
        code: 'ALREADY_REGISTERED',
        message: `That ${field === 'mobile' ? 'mobile number' : 'email address'} is already registered. Sign in instead.`,
        field,
      })
    }
  }

  // Registration always creates a devotee. Admins are provisioned by the temple.
  const user = createUser({ name, mobile, email, role: 'devotee' })
  const session = createSession(user.id)
  res.status(201).json({ token: session.token, user })
})

authRouter.post('/signout', (req, res) => {
  const token = req.header('authorization')?.split(' ')[1]
  if (token) deleteSession(token)
  res.json({ ok: true })
})

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

authRouter.patch('/me', requireAuth, (req, res) => {
  const validated = validateContact(req.body ?? {})
  if (!validated.ok) return fail(res, 400, validated.error)

  const { name, mobile, email } = validated.value
  const me = req.user!

  for (const [field, value] of [
    ['mobile', mobile],
    ['email', email],
  ] as const) {
    if (!value) continue
    const owner = findUserByIdentifier(value)
    if (owner && owner.id !== me.id) {
      return fail(res, 409, {
        code: 'ALREADY_REGISTERED',
        message: `That ${field === 'mobile' ? 'mobile number' : 'email address'} belongs to another account.`,
        field,
      })
    }
  }

  const user = updateUser(me.id, { name, mobile: mobile ?? '', email: email ?? '' })
  res.json({ user })
})

/** Admin-only. Proves role enforcement lives on the server, not just the UI. */
authRouter.get('/users', requireRole('admin'), (_req, res) => {
  res.json({ users: listUsers() })
})
