-- Temple CRM schema. Applied on every API boot, so every statement is idempotent.
-- Change this file and restart; there is no migration tool.
--
-- The three CHECK constraints marked RULE below are the spine of the design:
-- they make it impossible for any lane's code to oversell a slot, exceed the
-- visitor cap, or drive stock negative. Application checks exist only to produce
-- a good error message before a constraint would fire.

CREATE SEQUENCE IF NOT EXISTS booking_ref_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS order_ref_seq START 1000;

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  mobile        text,
  email         text,
  -- scrypt digest, never a plaintext password. Nullable so a database created
  -- before authentication existed still migrates cleanly.
  password_hash text,
  role          text NOT NULL CHECK (role IN ('devotee', 'admin')),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Runs for databases created before password_hash existed; a no-op afterwards.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;

-- Mobile and email are sign-in identifiers, so they must be unique. Partial
-- indexes because either may be absent, and NULLs should not collide.
CREATE UNIQUE INDEX IF NOT EXISTS users_mobile_key ON users (mobile) WHERE mobile IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email)) WHERE email IS NOT NULL;

/*
 * Server-side sessions. Only a SHA-256 digest of each token is stored, so a
 * database leak does not hand over live sessions. Tokens are 256 bits of
 * randomness, so a fast digest is appropriate here — unlike passwords, there
 * is nothing to brute force.
 */
CREATE TABLE IF NOT EXISTS sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text UNIQUE NOT NULL,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text NOT NULL DEFAULT '',
  venue       text NOT NULL DEFAULT '',
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  status      text NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft', 'published', 'completed', 'cancelled')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_dates_ordered CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS slots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  date         date NOT NULL,
  start_time   time NOT NULL,
  end_time     time NOT NULL,
  capacity     integer NOT NULL,
  booked_count integer NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  CONSTRAINT slots_times_ordered CHECK (end_time > start_time),
  -- DAR-02
  CONSTRAINT slots_capacity_positive CHECK (capacity > 0),
  -- RULE 1: remaining capacity can never go negative or exceed what was configured.
  CONSTRAINT slots_booked_within_capacity CHECK (booked_count >= 0 AND booked_count <= capacity)
);

CREATE TABLE IF NOT EXISTS bookings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference        text UNIQUE NOT NULL
                   DEFAULT 'DSN-' || lpad(nextval('booking_ref_seq')::text, 5, '0'),
  user_id          uuid NOT NULL REFERENCES users (id),
  slot_id          uuid NOT NULL REFERENCES slots (id),
  visitor_count    integer NOT NULL,
  attendee_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  status           text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  -- RULE 3: a positive whole number of visitors, capped at six per booking.
  CONSTRAINT bookings_visitor_count_valid CHECK (visitor_count > 0 AND visitor_count <= 6)
);

CREATE TABLE IF NOT EXISTS prasadam_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text NOT NULL DEFAULT '',
  -- RULE 7: informational only. No payment is ever collected against this.
  display_price numeric(10, 2) NOT NULL DEFAULT 0,
  stock         integer NOT NULL DEFAULT 0,
  reorder_level integer NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- RULE 5: stock can never go negative.
  CONSTRAINT prasadam_stock_non_negative CHECK (stock >= 0),
  -- PRA-05
  CONSTRAINT prasadam_reorder_non_negative CHECK (reorder_level >= 0)
);

CREATE TABLE IF NOT EXISTS prasadam_orders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference  text UNIQUE NOT NULL
             DEFAULT 'PRS-' || lpad(nextval('order_ref_seq')::text, 5, '0'),
  user_id    uuid NOT NULL REFERENCES users (id),
  status     text NOT NULL DEFAULT 'confirmed'
             CHECK (status IN ('confirmed', 'ready', 'fulfilled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES prasadam_orders (id) ON DELETE CASCADE,
  item_id       uuid NOT NULL REFERENCES prasadam_items (id),
  quantity      integer NOT NULL,
  display_price numeric(10, 2) NOT NULL DEFAULT 0,
  CONSTRAINT order_items_quantity_positive CHECK (quantity > 0)
);

-- Append-only audit of every stock change, so the count is always explainable.
CREATE TABLE IF NOT EXISTS inventory_movements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    uuid NOT NULL REFERENCES prasadam_items (id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('reserve', 'release', 'restock', 'adjust')),
  quantity   integer NOT NULL,
  reason     text NOT NULL DEFAULT '',
  created_by uuid REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS slots_event_id_idx ON slots (event_id);
CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON bookings (user_id);
CREATE INDEX IF NOT EXISTS bookings_slot_id_idx ON bookings (slot_id);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);
