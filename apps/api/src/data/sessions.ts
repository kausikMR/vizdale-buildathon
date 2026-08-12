import { createHash, randomBytes } from 'node:crypto'
import { getDb } from '../db/index.js'
import type { Role, User, UserStatus } from '../types.js'

/** Sessions last a fortnight; long enough for a demo, short enough to expire. */
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000

/**
 * Tokens are 256 bits of randomness, so only their SHA-256 digest is stored —
 * a database leak yields no usable session. There is nothing to brute force in
 * a random token, so a fast digest is the right tool here (unlike passwords).
 */
function digest(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export interface IssuedSession {
  token: string
  expiresAt: string
}

export async function createSession(userId: string): Promise<IssuedSession> {
  const db = await getDb()
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await db.query(
    `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)`,
    [digest(token), userId, expiresAt.toISOString()],
  )

  return { token, expiresAt: expiresAt.toISOString() }
}

interface SessionUserRow {
  id: string
  name: string
  mobile: string | null
  email: string | null
  role: Role
  status: UserStatus
  created_at: Date | string
}

/** Resolves the signed-in user, ignoring expired sessions. */
export async function findSessionUser(token: string): Promise<User | null> {
  const db = await getDb()
  const { rows } = await db.query<SessionUserRow>(
    `SELECT u.id, u.name, u.mobile, u.email, u.role, u.status, u.created_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [digest(token)],
  )

  const row = rows[0]
  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    mobile: row.mobile,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

export async function deleteSession(token: string): Promise<void> {
  const db = await getDb()
  await db.query(`DELETE FROM sessions WHERE token_hash = $1`, [digest(token)])
}

/** Housekeeping on boot so expired rows do not accumulate. */
export async function deleteExpiredSessions(): Promise<void> {
  const db = await getDb()
  await db.query(`DELETE FROM sessions WHERE expires_at <= now()`)
}
