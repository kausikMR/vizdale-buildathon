-- Demo data. Applied on every API boot after schema.sql, so it is idempotent:
-- ON CONFLICT DO NOTHING means restarting never duplicates or overwrites rows.
--
-- Fictional data only — no real identity or payment data (PRD section 7).
-- UUIDs are fixed so any lane can hard-code them.
--
-- Scope note: only the auth module is implemented, so only users are seeded here.
-- The event, slot, prasadam and booking fixtures described in CONTRACT.md
-- section 6 belong with those lanes and drop in below without changes here.

INSERT INTO users (id, name, mobile, email, role, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Priya Raman',  '9800000001', 'priya@example.org',  'admin',   'active'),
  ('22222222-2222-2222-2222-222222222222', 'Arjun Iyer',   '9800000002', 'arjun@example.org',  'devotee', 'active'),
  ('33333333-3333-3333-3333-333333333333', 'Lakshmi Nair', '9800000003', 'lakshmi@example.org', 'devotee', 'active')
ON CONFLICT (id) DO NOTHING;
