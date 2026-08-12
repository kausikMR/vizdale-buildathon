// HTTP surface. Every handler is thin: validation and business rules live in
// store.ts so the rules hold no matter which route reaches them.

import { Router, type NextFunction, type Request, type Response } from "express";
import * as store from "./store.js";
import { RuleError } from "./store.js";
import type { BookingStatus, OrderStatus, Role, User } from "./types.js";
import { MAX_VISITORS_PER_BOOKING } from "./types.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      actor?: User;
    }
  }
}

export const router = Router();

// ---------------------------------------------------------------------------
// Simulated session (AUTH-01). The web app sends the signed-in user's id in a
// header. There is no password and no token — this stands in for real auth and
// is labelled as simulated throughout the UI.
// ---------------------------------------------------------------------------

function attachActor(req: Request, _res: Response, next: NextFunction): void {
  const id = req.header("x-user-id");
  if (id) req.actor = store.findUser(id);
  next();
}

function requireUser(req: Request): User {
  if (!req.actor) {
    throw new RuleError(401, "no_session", "Please sign in to continue.");
  }
  return req.actor;
}

/** AUTH-02: admin-only actions are refused for devotee accounts. */
function requireAdmin(req: Request): User {
  const user = requireUser(req);
  if (user.role !== "admin") {
    throw new RuleError(403, "forbidden", "This area is for temple staff only.");
  }
  return user;
}

router.use(attachActor);

// ---------------------------------------------------------------------------
// Duplicate-submit protection (PRD section 7). A client sends the same
// Idempotency-Key when retrying; we replay the first response instead of
// creating a second booking or order.
// ---------------------------------------------------------------------------

const replayCache = new Map<string, { status: number; body: unknown }>();

function idempotent(req: Request, res: Response, next: NextFunction): void {
  const key = req.header("idempotency-key");
  if (!key) return next();

  const cached = replayCache.get(key);
  if (cached) {
    res.status(cached.status).json({ ...(cached.body as object), replayed: true });
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    if (res.statusCode < 400) replayCache.set(key, { status: res.statusCode, body });
    return originalJson(body);
  };
  next();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

router.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "api" });
});

/** Names offered as one-tap sign-in on the demo sign-in screen. */
router.get("/auth/known-users", (_req, res) => {
  res.json({
    users: store.db.users
      .filter((u) => u.status === "active")
      .map((u) => ({ id: u.id, name: u.name, role: u.role })),
  });
});

router.post("/auth/sign-in", (req, res) => {
  const user = store.signIn({
    name: req.body?.name,
    role: req.body?.role,
    password: req.body?.password,
  });
  res.status(201).json({ user });
});

router.get("/auth/me", (req, res) => {
  res.json({ user: requireUser(req) });
});

router.patch("/auth/me", (req, res) => {
  const user = requireUser(req);
  res.json({ user: store.updateProfile(user.id, req.body ?? {}) });
});

// ---------------------------------------------------------------------------
// Events and slots
// ---------------------------------------------------------------------------

function serialiseEvent(eventId: string, role: Role) {
  const event = store.findEvent(eventId);
  if (!event) throw new RuleError(404, "not_found", "That event no longer exists.");
  const slots = store.slotsForEvent(eventId).map((s) => ({
    ...s,
    remaining: store.remainingCapacity(s),
    bookable: store.slotIsBookable(s),
  }));
  // DAR-03: devotees only see slots they could actually book.
  const visibleSlots = role === "admin" ? slots : slots.filter((s) => s.bookable);
  return { ...event, ...store.eventCapacity(eventId), slots: visibleSlots };
}

router.get("/events", (req, res) => {
  const role: Role = req.actor?.role ?? "devotee";
  // DAR-03: devotees see published events only.
  const events = store.db.events
    .filter((e) => (role === "admin" ? true : e.status === "published"))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((e) => serialiseEvent(e.id, role))
    // A published event whose slots have all passed is not worth showing a devotee.
    .filter((e) => (role === "admin" ? true : e.slots.length > 0));
  res.json({ events });
});

router.get("/events/:id", (req, res) => {
  const role: Role = req.actor?.role ?? "devotee";
  const event = serialiseEvent(req.params.id, role);
  if (role !== "admin" && event.status !== "published") {
    throw new RuleError(404, "not_found", "That event is not available.");
  }
  res.json({ event });
});

router.post("/events", (req, res) => {
  requireAdmin(req);
  const event = store.createEvent(req.body ?? {});
  res.status(201).json({ event: serialiseEvent(event.id, "admin") });
});

router.patch("/events/:id", (req, res) => {
  requireAdmin(req);
  const event = store.updateEvent(req.params.id, req.body ?? {});
  res.json({ event: serialiseEvent(event.id, "admin") });
});

router.post("/events/:id/slots", (req, res) => {
  requireAdmin(req);
  const slot = store.createSlot(req.params.id, req.body ?? {});
  res.status(201).json({ slot, event: serialiseEvent(slot.eventId, "admin") });
});

router.patch("/slots/:id", (req, res) => {
  requireAdmin(req);
  const slot = store.updateSlot(req.params.id, req.body ?? {});
  res.json({ slot, event: serialiseEvent(slot.eventId, "admin") });
});

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

router.post("/bookings", idempotent, (req, res) => {
  const actor = requireUser(req);
  // An admin may book on a devotee's behalf (assisted booking); everyone else
  // books only for themselves.
  const onBehalfOf = typeof req.body?.userId === "string" ? req.body.userId : null;
  const bookingUserId = actor.role === "admin" && onBehalfOf ? onBehalfOf : actor.id;

  const { booking, slot, event } = store.createBooking(bookingUserId, req.body ?? {});
  res.status(201).json({
    booking,
    slot: { ...slot, remaining: store.remainingCapacity(slot) },
    event: { id: event.id, title: event.title, venue: event.venue },
  });
});

router.get("/bookings", (req, res) => {
  const actor = requireUser(req);
  const status = req.query.status as BookingStatus | undefined;
  const date = typeof req.query.date === "string" ? req.query.date : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;

  // USR-01: devotees see only their own bookings, whatever they ask for.
  const bookings = store.bookingViews({
    userId: actor.role === "admin" ? (typeof req.query.userId === "string" ? req.query.userId : undefined) : actor.id,
    status,
    date,
    search,
  });
  res.json({ bookings, maxVisitorsPerBooking: MAX_VISITORS_PER_BOOKING });
});

router.post("/bookings/:id/cancel", (req, res) => {
  const actor = requireUser(req);
  const booking = store.cancelBooking(req.params.id, actor);
  const slot = store.findSlot(booking.slotId);
  res.json({
    booking,
    slot: slot ? { ...slot, remaining: store.remainingCapacity(slot) } : null,
  });
});

// ---------------------------------------------------------------------------
// Prasadam items
// ---------------------------------------------------------------------------

router.get("/items", (req, res) => {
  const role: Role = req.actor?.role ?? "devotee";
  // Rule 6: admins see everything; devotees see active items only.
  const items = store.visibleItems(role).map((i) => ({
    ...i,
    reservable: i.active && i.stock > 0,
    lowStock: i.stock <= i.reorderLevel,
  }));
  res.json({ items, priceIsInformationalOnly: true });
});

router.post("/items", (req, res) => {
  const admin = requireAdmin(req);
  const item = store.createItem(req.body ?? {}, admin.id);
  res.status(201).json({ item });
});

router.patch("/items/:id", (req, res) => {
  requireAdmin(req);
  res.json({ item: store.updateItem(req.params.id, req.body ?? {}) });
});

router.post("/items/:id/adjust", (req, res) => {
  const admin = requireAdmin(req);
  const item = store.adjustStock(req.params.id, req.body?.delta, req.body?.reason, admin.id);
  res.json({ item });
});

router.get("/items/:id/movements", (req, res) => {
  requireAdmin(req);
  const movements = store.db.movements
    .filter((m) => m.itemId === req.params.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ movements });
});

// ---------------------------------------------------------------------------
// Prasadam orders
// ---------------------------------------------------------------------------

router.post("/orders", idempotent, (req, res) => {
  const actor = requireUser(req);
  const onBehalfOf = typeof req.body?.userId === "string" ? req.body.userId : null;
  const orderUserId = actor.role === "admin" && onBehalfOf ? onBehalfOf : actor.id;

  const { view } = store.createOrder(orderUserId, req.body?.lines);
  res.status(201).json({ order: view });
});

router.get("/orders", (req, res) => {
  const actor = requireUser(req);
  const status = req.query.status as OrderStatus | undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  // USR-01: devotees see only their own orders.
  const orders = store.orderViews({
    userId: actor.role === "admin" ? undefined : actor.id,
    status,
    search,
  });
  res.json({ orders });
});

router.patch("/orders/:id/status", (req, res) => {
  requireAdmin(req);
  res.json({ order: store.advanceOrder(req.params.id, req.body?.status) });
});

// ---------------------------------------------------------------------------
// Devotee directory and dashboard (admin only)
// ---------------------------------------------------------------------------

router.get("/devotees", (req, res) => {
  requireAdmin(req);
  const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
  const devotees = store.db.users
    .filter((u) => u.role === "devotee")
    .filter((u) => (search ? u.name.toLowerCase().includes(search) : true))
    .map((u) => {
      const bookings = store.bookingViews({ userId: u.id });
      const orders = store.orderViews({ userId: u.id });
      return {
        ...u,
        bookingCount: bookings.filter((b) => b.status === "confirmed").length,
        orderCount: orders.length,
        lastActivity: [...bookings, ...orders]
          .map((r) => r.createdAt)
          .sort((a, b) => b.localeCompare(a))[0] ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json({ devotees });
});

router.get("/dashboard", (req, res) => {
  requireAdmin(req);
  res.json(store.dashboard());
});

// ---------------------------------------------------------------------------
// Errors — EXP-01: every failure returns language safe to show the devotee.
// ---------------------------------------------------------------------------

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof RuleError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  console.error("Unexpected error:", err);
  res.status(500).json({
    error: {
      code: "server_error",
      message: "Something went wrong on our side. Please try again.",
    },
  });
}
