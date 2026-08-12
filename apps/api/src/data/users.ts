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
}): Promise<User> {
  const db = await getDb()
  // Registration always creates a devotee; admins are provisioned by the temple.
  const { rows } = await db.query<UserRow>(
    `INSERT INTO users (name, mobile, email, role, status)
     VALUES ($1, $2, $3, 'devotee', 'active')
     RETURNING ${COLUMNS}`,
    [input.name, input.mobile ?? null, input.email ?? null],
  )
  return toUser(rows[0]!)
}
