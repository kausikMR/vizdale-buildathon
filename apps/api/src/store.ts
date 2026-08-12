import { randomUUID } from 'node:crypto'
import type { Session, User, UserRole, UserStatus } from './types.js'

/**
 * Single in-memory data service for the auth module. All reads and writes go
 * through here so the real database can be swapped in behind the same surface
 * without touching the routes.
 *
 * Demo data is fictional. No credentials, ID numbers or payment data are stored.
 */

const users = new Map<string, User>()
const sessions = new Map<string, Session>()

/** Emails compare case-insensitively; mobiles ignore spaces, dashes and +. */
export function normaliseIdentifier(value: string): string {
  const trimmed = value.trim().toLowerCase()
  return trimmed.includes('@') ? trimmed : trimmed.replace(/[\s\-+()]/g, '')
}

function seedUser(
  name: string,
  contact: { mobile?: string; email?: string },
  role: UserRole,
  status: UserStatus = 'active',
): User {
  const user: User = {
    id: randomUUID(),
    name,
    ...contact,
    role,
    status,
    createdAt: new Date().toISOString(),
  }
  users.set(user.id, user)
  return user
}

seedUser('Lakshmi Iyer', { mobile: '9800000001', email: 'lakshmi@example.org' }, 'admin')
seedUser('Ravi Menon', { mobile: '9800000002', email: 'ravi@example.org' }, 'devotee')
seedUser('Anitha Rao', { mobile: '9800000003' }, 'devotee')
seedUser('Suresh Nair', { email: 'suresh@example.org' }, 'devotee', 'suspended')

export function listUsers(): User[] {
  return [...users.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function getUser(id: string): User | undefined {
  return users.get(id)
}

/** Matches against mobile or email; both are treated as sign-in identifiers. */
export function findUserByIdentifier(identifier: string): User | undefined {
  const needle = normaliseIdentifier(identifier)
  return [...users.values()].find(
    (u) =>
      (u.mobile && normaliseIdentifier(u.mobile) === needle) ||
      (u.email && normaliseIdentifier(u.email) === needle),
  )
}

export function createUser(input: {
  name: string
  mobile?: string
  email?: string
  role: UserRole
}): User {
  const user: User = {
    id: randomUUID(),
    name: input.name,
    ...(input.mobile ? { mobile: input.mobile } : {}),
    ...(input.email ? { email: input.email } : {}),
    role: input.role,
    status: 'active',
    createdAt: new Date().toISOString(),
  }
  users.set(user.id, user)
  return user
}

export function updateUser(
  id: string,
  patch: Partial<Pick<User, 'name' | 'mobile' | 'email'>>,
): User | undefined {
  const existing = users.get(id)
  if (!existing) return undefined

  const updated: User = { ...existing, ...patch }
  // An explicitly cleared contact field should disappear rather than persist.
  if (patch.mobile === '') delete updated.mobile
  if (patch.email === '') delete updated.email

  users.set(id, updated)
  return updated
}

export function createSession(userId: string): Session {
  const session: Session = {
    token: randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
  }
  sessions.set(session.token, session)
  return session
}

export function getSession(token: string): Session | undefined {
  return sessions.get(token)
}

export function deleteSession(token: string): void {
  sessions.delete(token)
}
