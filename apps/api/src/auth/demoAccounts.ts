import { setPasswordIfUnset } from '../data/users.js'
import { hashPassword } from './password.js'

/**
 * seed.sql cannot hash a password, so the seeded demo accounts get theirs here
 * on boot. Only accounts with no password are touched, so this never overwrites
 * a real one — including on a database that has been used.
 */
export const DEMO_USER_IDS = [
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
]

/** Overridable so a deployment is never stuck with a published password. */
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'Temple@123'

export async function ensureDemoPasswords(): Promise<void> {
  for (const id of DEMO_USER_IDS) {
    // Hashed per account rather than once and reused: a shared hash means a
    // shared salt, so one cracked digest would expose every account, and equal
    // digests advertise that the passwords are equal.
    await setPasswordIfUnset(id, await hashPassword(DEMO_PASSWORD))
  }
}
