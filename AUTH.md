# Authentication — deviation from CONTRACT.md

**This module no longer uses `x-user-id`.** If you are building another lane
against `CONTRACT.md` section 5, read this first: your requests will get `403`
until you change one header.

## What changed and why

`CONTRACT.md` specifies simulated sign-in — *"No passwords, no tokens. The client
sends the chosen seeded user's id"* — and the PRD puts real verification out of
scope. Both were implemented and working. They were then replaced with real
password authentication on an explicit instruction to do so, with the scope
conflict raised and reaffirmed.

The two schemes cannot coexist. If `x-user-id` still worked, anyone could name
any user id and skip the password entirely, which would make the password
decorative. So it is gone rather than deprecated.

## What other lanes must change

```diff
- headers: { 'x-user-id': userId }
+ headers: { authorization: `Bearer ${token}` }
```

If you use `apps/web/src/lib/api.ts`, this is already handled — the header is
attached for you and there is nothing to change.

Obtain a token from `POST /api/auth/signin`:

```jsonc
// request
{ "identifier": "9800000001", "password": "Temple@123" }
// response
{ "token": "…", "expiresAt": "2026-08-26T…", "user": { … } }
```

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/signin` | none | identifier + password → token |
| POST | `/api/auth/signout` | bearer | revokes the token server-side |
| GET | `/api/me` | bearer | current user |
| POST | `/api/users` | none | registration; requires a password, returns a token |
| GET | `/api/devotees` | bearer, admin | devotee directory |

`GET /api/auth/users` **has been removed.** It published every account
unauthenticated, which is an enumeration vector once passwords exist, and it
only existed to support one-click sign-in. Demo identifiers are now static text
on the sign-in screen.

## Error codes

Added to the contract's set:

| Code | Status | When |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | wrong identifier **or** wrong password — deliberately does not say which |
| `PASSWORD_REQUIRED` | 400 | no password supplied |
| `PASSWORD_TOO_SHORT` | 400 | under 8 characters |
| `ACCOUNT_INACTIVE` | 403 | credentials correct, account not active |

`NOT_SIGNED_IN` and `ADMIN_ONLY` keep their contract meaning and both stay `403`.

## Demo accounts

| Name | Role | Identifier |
|---|---|---|
| Priya | admin | `9800000001` |
| Arjun | devotee | `9800000002` |
| Lakshmi | devotee | `9800000003` |

Password `Temple@123`, override with `DEMO_PASSWORD`. Passwords are set on boot
only for accounts that have none, so a real password is never overwritten. The
contract's fixed UUIDs are unchanged.

Names are given names only, without surnames: Indian surnames commonly carry
caste and demo fixtures should not encode it. This differs from `CONTRACT.md`
section 6, which should be updated to match.

## How it works

- **Passwords** — scrypt (`N=16384, r=8, p=1`, 64-byte key, 16-byte random salt
  per password). Chosen over bcrypt because it is memory-hard and built into
  Node, so there is no dependency or native build step. Parameters are stored
  with each digest, so they can be raised later without invalidating old hashes.
- **Comparison** is constant-time via `timingSafeEqual`.
- **Unknown accounts** are verified against a decoy hash so a missing account
  costs the same time as a wrong password. Without this, sign-in answers "does
  this mobile number have an account?" in a fraction of the time — measured at
  1.3 ms versus 20.2 ms before the fix, and 19.9 versus 20.2 ms after.
- **Sessions** are 256-bit random tokens; only their SHA-256 digest is stored,
  so a database leak yields no usable session. They expire after 14 days, and
  sign-out deletes the row, so a captured token dies immediately.

## What this is still not

Honest limits, so nobody mistakes this for production auth:

- **No rate limiting or lockout.** Passwords can be guessed as fast as the
  server responds. This is the biggest remaining gap.
- **No password reset**, no email or mobile verification — an address is never
  proved to belong to whoever typed it.
- **No password strength rule** beyond a length minimum.
- **Tokens live in `localStorage`**, so any XSS on the page can read one.
  `httpOnly` cookies with CSRF protection would be the production choice.
- **The demo password is published** in this file and on the sign-in screen.
