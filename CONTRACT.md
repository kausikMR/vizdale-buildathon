# Temple CRM — Data & API Contract

Reference for everyone building on the foundation layer. Source of truth for entity
shapes is [`apps/api/src/types.ts`](apps/api/src/types.ts), mirrored verbatim at
`apps/web/src/lib/types.ts` — **edit both together**.

Requirement IDs (`DAR-04`, `PRA-03`, …) and rule numbers refer to the Buildathon PRD.

---

## 1. Running it

```bash
npm install
cp apps/api/.env.example apps/api/.env   # set DATABASE_URL
npm run dev:api                          # :4000
npm run dev:web                          # :5173
```

`docker compose up -d` (root) starts a local Postgres matching the default
`DATABASE_URL`. Any hosted Postgres works — only the env var changes.

The API applies `schema.sql` then `seed.sql` on **every boot**. Both are idempotent,
so restarting the API guarantees the database matches the code. There is no
migration tool to fight with: change `schema.sql`, restart.

`/api/*` from the web dev server is proxied to `:4000`, so always call relative
paths (`/api/events`), never `http://localhost:4000`.

---

## 2. Status enums

| Entity | Values | Transitions |
|---|---|---|
| `Role` | `devotee`, `admin` | — |
| `UserStatus` | `active`, `inactive` | — |
| `EventStatus` | `draft`, `published`, `completed`, `cancelled` | `draft ⇄ published`, either → `completed`/`cancelled` |
| `SlotStatus` | `open`, `closed` | admin toggle |
| `BookingStatus` | `confirmed`, `cancelled` | `confirmed → cancelled`, one way |
| `OrderStatus` | `confirmed`, `ready`, `fulfilled` | forward only, one step at a time (`PRA-04`) |
| `MovementType` | `reserve`, `release`, `restock`, `adjust` | — |

`MAX_VISITORS_PER_BOOKING = 6` (Rule 3). `ORDER_FLOW` holds the legal order progression.

---

## 3. Database schema

Postgres. `uuid` primary keys via `gen_random_uuid()`. Defined in
[`apps/api/src/db/schema.sql`](apps/api/src/db/schema.sql).

### users
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL | |
| mobile, email | text | |
| role | text NOT NULL | `devotee` \| `admin` |
| status | text NOT NULL | default `active` |
| created_at | timestamptz | |

### events
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| title | text NOT NULL | |
| description, venue | text NOT NULL | default `''` |
| start_date, end_date | date NOT NULL | CHECK `end_date >= start_date` |
| status | text NOT NULL | default `draft` |
| created_at | timestamptz | |

### slots
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| event_id | uuid → events | ON DELETE CASCADE |
| date | date NOT NULL | |
| start_time, end_time | time NOT NULL | CHECK `end_time > start_time` |
| capacity | integer NOT NULL | CHECK `> 0` (`DAR-02`) |
| booked_count | integer NOT NULL | **CHECK `>= 0 AND <= capacity`** (Rule 1) |
| status | text NOT NULL | default `open` |

### bookings
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| reference | text UNIQUE | `DEFAULT 'DSN-' \|\| lpad(nextval('booking_ref_seq'), 5, '0')` |
| user_id | uuid → users | |
| slot_id | uuid → slots | |
| visitor_count | integer NOT NULL | **CHECK `> 0 AND <= 6`** (Rule 3) |
| attendee_details | jsonb NOT NULL | `[{ "name": "…", "age": 34 }]`, default `[]` |
| status | text NOT NULL | default `confirmed` |
| created_at | timestamptz | |

### prasadam_items
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL | |
| description | text NOT NULL | default `''` |
| display_price | numeric(10,2) | **Rule 7: informational only, never charged** |
| stock | integer NOT NULL | **CHECK `>= 0`** (Rule 5) |
| reorder_level | integer NOT NULL | CHECK `>= 0` (`PRA-05`) |
| active | boolean NOT NULL | default `true` |
| created_at | timestamptz | |

### prasadam_orders
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| reference | text UNIQUE | `DEFAULT 'PRS-' \|\| lpad(nextval('order_ref_seq'), 5, '0')` |
| user_id | uuid → users | |
| status | text NOT NULL | default `confirmed` |
| created_at | timestamptz | |

### order_items
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid → prasadam_orders | ON DELETE CASCADE |
| item_id | uuid → prasadam_items | |
| quantity | integer NOT NULL | CHECK `> 0` |
| display_price | numeric(10,2) | price at reservation time |

### inventory_movements
Append-only audit of every stock change, so the count is always explainable.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| item_id | uuid → prasadam_items | ON DELETE CASCADE |
| type | text NOT NULL | `reserve` \| `release` \| `restock` \| `adjust` |
| quantity | integer NOT NULL | signed: negative removes stock |
| reason | text NOT NULL | default `''` |
| created_by | uuid → users | |
| created_at | timestamptz | |

---

## 4. Invariants — how the hard rules are actually enforced

**The three bolded CHECKs above are the spine of the design.** Rules 1, 3 and 5 are
*database* constraints, so no bug in any lane's code can oversell a slot or drive
stock negative. Application-level checks exist only to produce a good error message
*before* a constraint would fire.

Both critical mutations are a single guarded `UPDATE` inside a transaction —
validation and mutation are the **same statement**, so there is no window where a
check has passed but the write hasn't landed:

```sql
-- Booking (DAR-04 / DAR-05)
UPDATE slots SET booked_count = booked_count + $n
WHERE id = $1 AND status = 'open' AND capacity - booked_count >= $n;

-- Reservation (PRA-02 / PRA-03, Rule 5)
UPDATE prasadam_items SET stock = stock - $q
WHERE id = $1 AND active = true AND stock >= $q;
```

`rowCount === 0` means the invariant would have broken → reject with a precise,
actionable message. Two devotees clicking at the same instant serialise on the row
lock: one wins, the other is told exactly how many places are left.

**Cancellation (Rule 4 — restore exactly once)** uses the same trick:

```sql
UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND status = 'confirmed';
```

A double submit matches zero rows the second time, so capacity is never credited
back twice. Idempotent by construction, not by a flag.

**Multi-item orders** run every line in one transaction. If any line fails, the whole
thing rolls back — a devotee never receives a partially-filled order.

Rule 2 (unpublished/completed events reject bookings) and Rule 6 (inactive or
out-of-stock items not reservable by devotees) are enforced in the data layer, not
in routes, so no future endpoint can leak past them.

---

## 5. API

Base path `/api`. JSON in, JSON out, **camelCase** field names.

### Authentication (simulated)

No passwords, no tokens. The client sends the chosen seeded user's id:

```
x-user-id: 11111111-1111-1111-1111-111111111111
```

The server looks up the role itself. **Hiding admin nav in the UI is cosmetic —
`requireAdmin` on the server is the actual gate** (`AUTH-02`). A devotee cannot reach
admin data by editing the frontend.

### Endpoints

| Method | Path | Devotee | Admin |
|---|---|---|---|
| GET | `/health` | ✅ | ✅ |
| GET | `/auth/users` | ✅ | ✅ |
| POST | `/auth/signin` | ✅ | ✅ |
| GET | `/me` | ✅ | ✅ |
| GET | `/events` · `/events/:id` | published only, bookable slots only | everything |
| POST | `/events` | ❌ | ✅ |
| PATCH | `/events/:id` | ❌ | ✅ |
| POST | `/events/:id/publish` · `/unpublish` | ❌ | ✅ |
| POST | `/events/:id/slots` | ❌ | ✅ |
| GET | `/bookings` · `/bookings/:id` | own only | all, `?search=` `?status=` |
| POST | `/bookings` | self | self or on-behalf-of |
| POST | `/bookings/:id/cancel` | own only | any |
| GET | `/prasadam` | active items only | includes inactive |
| POST | `/prasadam` | ❌ | ✅ |
| PATCH | `/prasadam/:id` | ❌ | ✅ |
| POST | `/prasadam/:id/adjust` | ❌ | ✅ |
| GET | `/orders` | own only | all, `?search=` |
| POST | `/orders` | self | self or on-behalf-of |
| PATCH | `/orders/:id/status` | ❌ | ✅ |
| GET | `/dashboard` | ❌ | ✅ |
| GET | `/devotees` | ❌ | ✅ |

`USR-01` is enforced by resolving the devotee's id from `x-user-id` server-side —
never from a query parameter a client could change.

### Derived fields the API adds

Lanes should **never recompute a business rule client-side**. Responses include:

| On | Field | Meaning |
|---|---|---|
| Slot | `remaining` | `capacity - bookedCount` (never negative) |
| Slot | `bookable` | open, has room, and not yet finished |
| Event | `totalCapacity`, `totalBooked` | summed across slots |
| Event | `slots[]` | filtered to bookable ones for devotees |
| PrasadamItem | `lowStock` | `stock <= reorderLevel` (`PRA-05`) |
| PrasadamItem | `reservable` | `active && stock > 0` (Rule 6) |
| Booking | `eventTitle`, `venue`, `date`, `startTime`, `endTime`, `devoteeName` | joined for display |
| PrasadamOrder | `items[]`, `devoteeName` | joined |

### Key request bodies

```jsonc
// POST /events
{ "title": "Sri Rama Navami Darshan", "description": "", "venue": "Main Sanctum",
  "startDate": "2026-08-12", "endDate": "2026-08-14", "status": "draft" }

// POST /events/:id/slots
{ "date": "2026-08-12", "startTime": "06:00", "endTime": "08:00", "capacity": 50 }

// POST /bookings
{ "slotId": "…", "visitorCount": 2,
  "attendeeDetails": [{ "name": "Arjun Iyer", "age": 34 }, { "name": "Meera Iyer" }] }

// POST /orders
{ "items": [{ "itemId": "…", "quantity": 2 }, { "itemId": "…", "quantity": 1 }] }

// POST /prasadam/:id/adjust   — negative delta removes stock
{ "delta": -5, "reason": "Damaged in transit" }

// PATCH /orders/:id/status
{ "status": "ready" }
```

### Errors

Every failure returns exactly one shape. **`message` is already written for a devotee
to read (`EXP-01`) — render it directly, do not rewrite it.**

```json
{ "error": { "code": "INSUFFICIENT_CAPACITY",
             "message": "Only 3 places left in this slot. Reduce your visitor count to 3 or choose another slot." } }
```

| Code | Status | When |
|---|---|---|
| `NOT_SIGNED_IN` | 403 | no or unknown `x-user-id` |
| `ADMIN_ONLY` | 403 | devotee hit an admin route |
| `VISITOR_COUNT_INVALID` / `_TOO_HIGH` | 400 | Rule 3 |
| `INSUFFICIENT_CAPACITY` | 409 | `DAR-04` — message states places remaining |
| `EVENT_NOT_BOOKABLE` | 409 | Rule 2 |
| `SLOT_CLOSED` / `SLOT_PAST` | 409 | slot not open for booking |
| `ALREADY_CANCELLED` | 409 | Rule 4 double-cancel guard |
| `INSUFFICIENT_STOCK` | 409 | `PRA-02` — message states stock remaining |
| `ITEM_INACTIVE` | 409 | Rule 6 |
| `STOCK_WOULD_GO_NEGATIVE` | 409 | Rule 5 on admin adjustment |
| `STATUS_TRANSITION_INVALID` | 409 | `PRA-04` — names the only legal next status |
| `NO_SLOTS` | 400 | publishing an event with nothing to book |
| `CONSTRAINT_VIOLATION` | 409 | a DB CHECK caught what app code missed |
| `INTERNAL_ERROR` | 500 | unexpected; nothing was saved |

### Frontend helpers

```ts
import { api, messageFor } from './lib/api'
import { useApi, useMutation } from './lib/useApi'
import { useAuth } from './lib/auth'

const { data, loading, error, reload } = useApi<Event[]>('/events')
const { run, pending, error: saveError } = useMutation(api.post)
```

`useMutation` blocks re-entry while pending — that covers the "protected from
duplicate submit" requirement. After a successful mutation call `reload()` on the
lists that should change; that is how "everything updates immediately" is satisfied.

---

## 6. Seeded demo data

Fixed UUIDs, so anything can hard-code them. Dates are relative to `CURRENT_DATE`,
so the dashboard's "today" tiles are always populated. Fictional data only — no real
ID or payment data (§7).

**Users**

| Name | Role | Id |
|---|---|---|
| Priya Raman | admin | `11111111-1111-1111-1111-111111111111` |
| Arjun Iyer | devotee | `22222222-2222-2222-2222-222222222222` |
| Lakshmi Nair | devotee | `33333333-3333-3333-3333-333333333333` |

**Events** — *Sri Rama Navami Darshan* (`published`, today → +2 days, 4 slots) and
*Kartika Deepam Evening Darshan* (`draft`, +7 days, 1 slot).

**Slots** — deliberately varied for demoing: `50/12` free, `40/38` nearly full (good
for showing the capacity rejection), `60/4`, plus tomorrow `50/0`.

**Prasadam** — Laddu `120`, Panchamrutham `40`, Kumkum `200`, Tulsi Garland `12`
(below its reorder level of 20, so it demos `PRA-05`), Vibhuti `0` (out of stock),
Festival Hamper `inactive` (visible to admin, not reservable — Rule 6).

One existing booking `DSN-01000` so My Bookings and admin lists aren't empty on first load.

---

## 7. Open decisions

Defaults are in place for all of these — nothing is blocked, but the starred ones
could cause rework once screens exist.

1. **`DATABASE_URL`** — not yet supplied; the schema has not been run against a live
   database. Docker's daemon is unreachable on this machine.
2. **★ Order cancellation** — the PRD gives orders no `cancelled` status, but the My
   Bookings screen mentions cancel. Currently bookings cancel and orders do not, so
   reserved stock is never released. `inventory_movements` already has a `release`
   type ready if we add it.
3. **★ Derived fields vs `types.ts`** — the API returns the derived fields in §5, but
   `types.ts` now declares base entities only. Either the interfaces gain view
   variants (`SlotView`, `EventDetail`) or the API stops sending them. Also note the
   API still imports `ORDER_STATUS_FLOW`, since renamed to `ORDER_FLOW`, and
   `DashboardSummary` / `ApiError` are no longer declared — the API app does not
   compile until this is reconciled.
4. **`Booking.cancelledAt`** exists in `types.ts` but has no column yet; add it to
   `bookings` if we want to display cancellation time.
5. **Registration** — the screen list says "Sign in/Register" but there is no
   user-creation endpoint. Seeded accounts only, or add `POST /users`?
6. **Slot open/closed toggle** — the column is honoured everywhere, but no endpoint
   flips it.
7. **Admin assisted booking** — admins may currently book for a devotee by passing
   `userId`. Confirm that is wanted.
8. **`displayPrice`** — informational only. Show a total labelled "no payment
   collected", or omit prices entirely?
