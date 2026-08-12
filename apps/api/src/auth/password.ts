import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>

/**
 * Password hashing with scrypt.
 *
 * scrypt rather than bcrypt: it is memory-hard, ships with Node, and needs no
 * dependency or native build step. Parameters are stored alongside the digest
 * so they can be raised later without invalidating existing hashes.
 */
const PARAMS = { N: 16384, r: 8, p: 1 }
const KEY_LENGTH = 64
const SALT_LENGTH = 16

export const MIN_PASSWORD_LENGTH = 8

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)
  const derived = await scryptAsync(password, salt, KEY_LENGTH, PARAMS)
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64'),
    derived.toString('base64'),
  ].join('$')
}

let decoy: Promise<string> | null = null

/**
 * A digest nothing will ever match, hashed with the same parameters as a real
 * one. Sign-in verifies against this when no account matched, so a missing
 * account costs the same time as a wrong password — otherwise the response
 * time alone reveals which mobile numbers are registered.
 *
 * Computed once and reused; the value is never compared to anything sensitive.
 */
export function decoyHash(): Promise<string> {
  decoy ??= hashPassword(randomBytes(32).toString('hex'))
  return decoy
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false

  const [scheme, n, r, p, saltB64, digestB64] = stored.split('$')
  if (scheme !== 'scrypt' || !saltB64 || !digestB64) return false

  const expected = Buffer.from(digestB64, 'base64')
  const actual = await scryptAsync(password, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  })

  // Constant-time comparison, so response timing does not leak how much of the
  // digest matched.
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
