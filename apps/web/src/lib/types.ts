// Duplicated from apps/api/src/types.ts by convention — no shared package.
export type UserRole = 'devotee' | 'admin'
export type UserStatus = 'active' | 'suspended'

export interface User {
  id: string
  name: string
  mobile?: string
  email?: string
  role: UserRole
  status: UserStatus
  createdAt: string
}

export interface DemoAccount {
  id: string
  name: string
  role: UserRole
  status: UserStatus
  identifier?: string
}
