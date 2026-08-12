export type UserRole = 'devotee' | 'admin'
export type UserStatus = 'active' | 'suspended'

export const USER_ROLES: UserRole[] = ['devotee', 'admin']
export const USER_STATUSES: UserStatus[] = ['active', 'suspended']

export interface User {
  id: string
  name: string
  /** At least one of mobile/email is always present. */
  mobile?: string
  email?: string
  role: UserRole
  status: UserStatus
  createdAt: string
}

/** A signed-in session. Simulated — no credentials are ever checked. */
export interface Session {
  token: string
  userId: string
  createdAt: string
}
