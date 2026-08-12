import { getDb } from '../db/index.js'
import type { Role, User, UserStatus } from '../types.js'

/**
 * Data access for users. Rows come back snake_case from Postgres and leave this
 * module camelCase, so no route or client ever sees a column name.
 */

interface UserRow {
  id: string
  name: string
  mobile: string | null
  email: string | null
  role: Role
  status: UserStatus
  created_at: Date | string
}

const COLUMNS = 'id, name, mobile, email, role, status, created_at'

function toUser(row: UserRow): User {
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

/** Emails compare case-insensitively; mobiles ignore spaces, dashes and +. */
export function normaliseIdentifier(value: string): string {
  const trimmed = value.trim().toLowerCase()
  return trimmed.includes('@') ? trimmed : trimmed.replace(/[\s\-+()]/g, '')
}

export async function listUsers(role?: Role): Promise<User[]> {
  const db = await getDb()
  const { rows } = await db.query<UserRow>(
    role
      ? `SELECT ${COLUMNS} FROM users WHERE role = $1 ORDER BY name`
      : `SELECT ${COLUMNS} FROM users ORDER BY name`,
    role ? [role] : [],
  )
  return rows.map(toUser)
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await getDb()
  // A malformed uuid would make Postgres raise rather than simply not match.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { rows } = await db.query<UserRow>(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id])
  return rows[0] ? toUser(rows[0]) : null
}

/** Matches mobile or email; both are sign-in identifiers. */
export async function findUserByIdentifier(identifier: string): Promise<User | null> {
  const db = await getDb()
  const needle = normaliseIdentifier(identifier)
  const { rows } = await db.query<UserRow>(
    `SELECT ${COLUMNS} FROM users
     WHERE lower(regexp_replace(coalesce(mobile, ''), '[\\s\\-+()]', '', 'g')) = $1
        OR lower(coalesce(email, '')) = $1`,
    [needle],
  )
  return rows[0] ? toUser(rows[0]) : null
}

export async function createUser(input: {
  name: string
  mobile?: string
  email?: string
  passwordHash: string
}): Promise<User> {
  const db = await getDb()
  // Registration always creates a devotee; admins are provisioned by the temple.
  const { rows } = await db.query<UserRow>(
    `INSERT INTO users (name, mobile, email, password_hash, role, status)
     VALUES ($1, $2, $3, $4, 'devotee', 'active')
     RETURNING ${COLUMNS}`,
    [input.name, input.mobile ?? null, input.email ?? null, input.passwordHash],
  )
  return toUser(rows[0]!)
}

/**
 * Looks up an account and its stored digest in one read, for sign-in. The hash
 * never leaves the data layer bundled with anything sent to a client.
 */
export async function findCredentialsByIdentifier(
  identifier: string,
): Promise<{ user: User; passwordHash: string | null } | null> {
  const db = await getDb()
  const needle = normaliseIdentifier(identifier)
  const { rows } = await db.query<UserRow & { password_hash: string | null }>(
    `SELECT ${COLUMNS}, password_hash FROM users
     WHERE lower(regexp_replace(coalesce(mobile, ''), '[\\s\\-+()]', '', 'g')) = $1
        OR lower(coalesce(email, '')) = $1`,
    [needle],
  )

  const row = rows[0]
  return row ? { user: toUser(row), passwordHash: row.password_hash } : null
}

/**
 * Gives the seeded demo accounts a password on boot, without touching any
 * account that already has one — so a real password is never overwritten.
 */
export async function setPasswordIfUnset(userId: string, passwordHash: string): Promise<void> {
  const db = await getDb()
  await db.query(`UPDATE users SET password_hash = $2 WHERE id = $1 AND password_hash IS NULL`, [
    userId,
    passwordHash,
  ])
}
