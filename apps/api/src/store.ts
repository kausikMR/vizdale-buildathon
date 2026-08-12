// The single shared data service for every flow (PRD section 6).
//
// CONCURRENCY NOTE — this is the core of business rules 1 and 5.
// Node runs this process on one thread, so a function that validates and mutates
// without ever yielding (no `await`, no callbacks, no I/O in between) is an
// indivisible critical section: no second request can observe or interleave with
// a half-applied change. Every mutator below is deliberately synchronous for
// that reason. Do not add `await` inside one — that would reintroduce the
// read-then-write gap that lets two devotees claim the same last seat.

import type {
  Attendee,
  Booking,
  BookingStatus,
  Event,
  EventStatus,
  InventoryMovement,
  MovementType,
  OrderItem,
  OrderStatus,
  PrasadamItem,
  PrasadamOrder,
  Role,
  Slot,
  User,
} from "./types.js";
import { MAX_VISITORS_PER_BOOKING, ORDER_FLOW } from "./types.js";

/** A rule violation that maps to a 4xx with language safe to show a user (EXP-01). */
export class RuleError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RuleError";
  }
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const db = {
  users: [] as User[],
  events: [] as Event[],
  slots: [] as Slot[],
  bookings: [] as Booking[],
  items: [] as PrasadamItem[],
  orders: [] as PrasadamOrder[],
  orderItems: [] as OrderItem[],
  movements: [] as InventoryMovement[],
};

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}_${(++idCounter).toString(36)}`;

let bookingRefSeq = 1001;
let orderRefSeq = 5001;
const nextBookingRef = () => `DSN-${String(bookingRefSeq++).padStart(5, "0")}`;
const nextOrderRef = () => `PRS-${String(orderRefSeq++).padStart(5, "0")}`;

const now = () => new Date().toISOString();

/** Local calendar date as YYYY-MM-DD; slot dates are compared as plain strings. */
export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const today = () => isoDate(new Date());

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function requirePositiveInt(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new RuleError(400, "invalid_number", `${label} must be a whole number of 1 or more.`);
  }
  return n;
}

function requireText(value: unknown, label: string): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) throw new RuleError(400, "required", `${label} is required.`);
  return s;
}

// ---------------------------------------------------------------------------
// Derived reads
// ---------------------------------------------------------------------------

/** Rule 1: remaining capacity = capacity - active visitors, never below zero. */
export function remainingCapacity(slot: Slot): number {
  return Math.max(0, slot.capacity - slot.bookedCount);
}

/** Rule 2 + DAR-03: only published events accept bookings. */
export function eventAcceptsBookings(event: Event): boolean {
  return event.status === "published";
}

/**
 * DAR-03: a slot is bookable only when its event is published, the slot is open,
 * its date has not passed, and seats remain.
 */
export function slotIsBookable(slot: Slot): boolean {
  const event = db.events.find((e) => e.id === slot.eventId);
  if (!event || !eventAcceptsBookings(event)) return false;
  if (slot.status !== "open") return false;
  if (slot.date < today()) return false;
  return remainingCapacity(slot) > 0;
}

export const findUser = (id: string) => db.users.find((u) => u.id === id);
export const findEvent = (id: string) => db.events.find((e) => e.id === id);
export const findSlot = (id: string) => db.slots.find((s) => s.id === id);
export const findItem = (id: string) => db.items.find((i) => i.id === id);

/** Slots for an event, chronological. */
export function slotsForEvent(eventId: string): Slot[] {
  return db.slots
    .filter((s) => s.eventId === eventId)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

/** Total configured capacity across an event's slots, for the admin list. */
export function eventCapacity(eventId: string): { capacity: number; booked: number } {
  return slotsForEvent(eventId).reduce(
    (acc, s) => ({ capacity: acc.capacity + s.capacity, booked: acc.booked + s.bookedCount }),
    { capacity: 0, booked: 0 },
  );
}

// ---------------------------------------------------------------------------
// Users — simulated sign-in (AUTH-01)
// ---------------------------------------------------------------------------

/**
 * Staff passwords, keyed by user id. Kept out of the User record on purpose so
 * a password can never be serialised into an API response.
 *
 * SIMULATED: the demo password is derived from the staff member's own name, and
 * is shown on the sign-in screen. This is a role gate for the demo, not real
 * authentication — there is no hashing and no session token.
 */
const staffPasswords = new Map<string, string>();

/** "Temple Admin" -> "temple-admin". */
export const demoPasswordFor = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "-");

export interface SignInInput {
  name?: unknown;
  /** Which door the user came through. Devotee is the default. */
  role?: unknown;
  password?: unknown;
}

/**
 * AUTH-01, simulated. The caller states which role they are signing in as:
 *
 *  - devotee: name only. An unknown name registers a devotee on the spot.
 *  - admin:   a password is always required. A name matching an existing staff
 *             account must supply that account's password; an unrecognised name
 *             registers a NEW staff account on the spot, using the password
 *             just entered as that account's password from then on.
 *
 * Choosing a role never grants it — the account's own role is what counts, so a
 * devotee cannot become an admin by picking the staff option (AUTH-02).
 */
export function signIn(input: SignInInput | string): User {
  // Tolerate the older `signIn(name)` shape so nothing breaks mid-build.
  const raw: SignInInput = typeof input === "string" ? { name: input } : (input ?? {});

  const name = requireText(raw.name, "Your name");
  const wantsAdmin = String(raw.role ?? "devotee") === "admin";
  const existing = db.users.find((u) => u.name.toLowerCase() === name.toLowerCase());

  if (existing && existing.status !== "active") {
    throw new RuleError(
      403,
      "inactive_user",
      "This account is inactive. Please contact the temple office.",
    );
  }

  if (wantsAdmin) {
    // The name is already taken by a devotee — refuse rather than silently
    // creating a second, differently-rolled account under the same name.
    if (existing && existing.role !== "admin") {
      throw new RuleError(
        409,
        "name_taken_by_devotee",
        "That name is already registered as a devotee. Choose a different name for your staff account.",
      );
    }

    const password = typeof raw.password === "string" ? raw.password.trim() : "";
    if (!password) {
      throw new RuleError(
        400,
        "password_required",
        existing
          ? "Please enter your staff password."
          : "Choose a password for your new staff account.",
      );
    }

    if (existing) {
      if (password !== staffPasswords.get(existing.id)) {
        throw new RuleError(
          401,
          "bad_password",
          "That password does not match this staff account. Please try again.",
        );
      }
      return existing;
    }

    // Unrecognised staff name: register a new admin account on the spot,
    // exactly as an unrecognised devotee name registers a new devotee.
    const staff: User = {
      id: nextId("usr"),
      name,
      mobile: "",
      email: "",
      role: "admin",
      status: "active",
      createdAt: now(),
    };
    db.users.push(staff);
    staffPasswords.set(staff.id, password);
    return staff;
  }

  // Devotee door. A staff name here is a wrong-door mistake, not a way in.
  if (existing && existing.role === "admin") {
    throw new RuleError(
      403,
      "staff_account",
      "That name belongs to a temple staff account. Choose “Temple staff” to sign in.",
    );
  }
  if (existing) return existing;

  const user: User = {
    id: nextId("usr"),
    name,
    mobile: "",
    email: "",
    role: "devotee",
    status: "active",
    createdAt: now(),
  };
  db.users.push(user);
  return user;
}

export function updateProfile(userId: string, patch: { mobile?: unknown; email?: unknown }): User {
  const user = findUser(userId);
  if (!user) throw new RuleError(404, "not_found", "We could not find your account.");
  if (patch.mobile !== undefined) user.mobile = String(patch.mobile ?? "").trim();
  if (patch.email !== undefined) user.email = String(patch.email ?? "").trim();
  return user;
}

// ---------------------------------------------------------------------------
// Events and slots (DAR-01, DAR-02)
// ---------------------------------------------------------------------------

export function createEvent(input: Record<string, unknown>): Event {
  const startDate = requireText(input.startDate, "Start date");
  const endDate = requireText(input.endDate, "End date");
  if (endDate < startDate) {
    throw new RuleError(400, "date_order", "The end date cannot be before the start date.");
  }
  const event: Event = {
    id: nextId("evt"),
    title: requireText(input.title, "Title"),
    description: typeof input.description === "string" ? input.description.trim() : "",
    venue: typeof input.venue === "string" ? input.venue.trim() : "",
    startDate,
    endDate,
    status: "draft",
    createdAt: now(),
  };
  db.events.push(event);
  return event;
}

export function updateEvent(eventId: string, patch: Record<string, unknown>): Event {
  const event = findEvent(eventId);
  if (!event) throw new RuleError(404, "not_found", "That event no longer exists.");

  if (patch.title !== undefined) event.title = requireText(patch.title, "Title");
  if (patch.description !== undefined) event.description = String(patch.description ?? "").trim();
  if (patch.venue !== undefined) event.venue = String(patch.venue ?? "").trim();
  if (patch.startDate !== undefined) event.startDate = requireText(patch.startDate, "Start date");
  if (patch.endDate !== undefined) event.endDate = requireText(patch.endDate, "End date");
  if (event.endDate < event.startDate) {
    throw new RuleError(400, "date_order", "The end date cannot be before the start date.");
  }

  if (patch.status !== undefined) {
    const status = String(patch.status) as EventStatus;
    const allowed: EventStatus[] = ["draft", "published", "completed", "cancelled"];
    if (!allowed.includes(status)) {
      throw new RuleError(400, "invalid_status", "That is not a valid event status.");
    }
    if (status === "published" && slotsForEvent(eventId).length === 0) {
      throw new RuleError(
        400,
        "no_slots",
        "Add at least one time slot before publishing, so devotees have something to book.",
      );
    }
    event.status = status;
  }
  return event;
}

export function createSlot(eventId: string, input: Record<string, unknown>): Slot {
  const event = findEvent(eventId);
  if (!event) throw new RuleError(404, "not_found", "That event no longer exists.");

  const date = requireText(input.date, "Slot date");
  const startTime = requireText(input.startTime, "Start time");
  const endTime = requireText(input.endTime, "End time");
  if (endTime <= startTime) {
    throw new RuleError(400, "time_order", "The end time must be after the start time.");
  }
  // DAR-02: capacity must be greater than zero.
  const capacity = requirePositiveInt(input.capacity, "Capacity");
  if (date < event.startDate || date > event.endDate) {
    throw new RuleError(
      400,
      "date_outside_event",
      `Slot dates must fall between ${event.startDate} and ${event.endDate}.`,
    );
  }

  const slot: Slot = {
    id: nextId("slt"),
    eventId,
    date,
    startTime,
    endTime,
    capacity,
    bookedCount: 0,
    status: "open",
  };
  db.slots.push(slot);
  return slot;
}

export function updateSlot(slotId: string, patch: Record<string, unknown>): Slot {
  const slot = findSlot(slotId);
  if (!slot) throw new RuleError(404, "not_found", "That time slot no longer exists.");

  if (patch.capacity !== undefined) {
    const capacity = requirePositiveInt(patch.capacity, "Capacity");
    // Rule 1: capacity can never be cut below seats already taken.
    if (capacity < slot.bookedCount) {
      throw new RuleError(
        409,
        "capacity_below_booked",
        `This slot already has ${slot.bookedCount} visitor(s) booked. Capacity cannot be set lower than that.`,
      );
    }
    slot.capacity = capacity;
  }
  if (patch.status !== undefined) {
    const status = String(patch.status) as SlotStatusInput;
    if (status !== "open" && status !== "closed") {
      throw new RuleError(400, "invalid_status", "A slot can only be open or closed.");
    }
    slot.status = status;
  }
  return slot;
}

type SlotStatusInput = "open" | "closed";

// ---------------------------------------------------------------------------
// Bookings (DAR-04, DAR-05, DAR-06)
// ---------------------------------------------------------------------------

export interface BookingResult {
  booking: Booking;
  slot: Slot;
  event: Event;
}

/**
 * Reserve `visitorCount` seats on a slot and create the booking.
 *
 * ATOMIC: validates and mutates with no yield point in between, so two
 * simultaneous requests for the last seats cannot both succeed. The second one
 * sees the first one's updated bookedCount and is rejected with the true
 * remaining figure.
 */
export function createBooking(
  userId: string,
  input: { slotId?: unknown; visitorCount?: unknown; attendeeDetails?: unknown },
): BookingResult {
  const user = findUser(userId);
  if (!user) throw new RuleError(401, "no_session", "Please sign in again to continue.");

  const slot = findSlot(String(input.slotId ?? ""));
  if (!slot) throw new RuleError(404, "not_found", "That time slot is no longer available.");

  const event = findEvent(slot.eventId);
  if (!event) throw new RuleError(404, "not_found", "That event no longer exists.");

  // Rule 2: unpublished, completed or cancelled events accept no new bookings.
  if (!eventAcceptsBookings(event)) {
    throw new RuleError(
      409,
      "event_closed",
      event.status === "draft"
        ? "This event is not open for booking yet."
        : `This event is ${event.status} and is no longer accepting bookings.`,
    );
  }
  if (slot.status !== "open") {
    throw new RuleError(409, "slot_closed", "This time slot has been closed. Please choose another slot.");
  }
  if (slot.date < today()) {
    throw new RuleError(409, "slot_past", "This time slot has already passed. Please choose an upcoming slot.");
  }

  // Rule 3: positive whole number, at most 6 per booking. Covers the
  // "two people attending together" case as one booking of visitorCount 2.
  const visitorCount = requirePositiveInt(input.visitorCount, "Number of visitors");
  if (visitorCount > MAX_VISITORS_PER_BOOKING) {
    throw new RuleError(
      400,
      "too_many_visitors",
      `A single booking can cover at most ${MAX_VISITORS_PER_BOOKING} visitors. Please make a second booking for the rest.`,
    );
  }

  const attendeeDetails = normaliseAttendees(input.attendeeDetails, visitorCount, user.name);

  // DAR-04 + Rule 1: reject when the party exceeds what is left.
  const remaining = remainingCapacity(slot);
  if (visitorCount > remaining) {
    throw new RuleError(
      409,
      "insufficient_capacity",
      remaining === 0
        ? "This slot just filled up. Please choose another time slot."
        : `Only ${remaining} place${remaining === 1 ? "" : "s"} left in this slot. Please reduce your party size or pick another slot.`,
    );
  }

  // --- critical section: no yield between the check above and the writes below.
  slot.bookedCount += visitorCount;
  const booking: Booking = {
    id: nextId("bkg"),
    reference: nextBookingRef(), // DAR-05: unique reference.
    userId,
    slotId: slot.id,
    visitorCount,
    attendeeDetails,
    status: "confirmed",
    createdAt: now(),
    cancelledAt: null,
  };
  db.bookings.push(booking);
  // --- end critical section

  return { booking, slot, event };
}

function normaliseAttendees(raw: unknown, visitorCount: number, fallbackName: string): Attendee[] {
  const list = Array.isArray(raw) ? raw : [];
  const attendees: Attendee[] = [];
  for (let i = 0; i < visitorCount; i++) {
    const entry = (list[i] ?? {}) as Record<string, unknown>;
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    if (!name && i === 0) {
      attendees.push({ name: fallbackName });
      continue;
    }
    if (!name) {
      throw new RuleError(
        400,
        "attendee_required",
        `Please enter a name for visitor ${i + 1}.`,
      );
    }
    const ageRaw = entry.age;
    const age = ageRaw === undefined || ageRaw === null || ageRaw === "" ? undefined : Number(ageRaw);
    if (age !== undefined && (!Number.isInteger(age) || age < 0 || age > 120)) {
      throw new RuleError(400, "invalid_age", `Please enter a valid age for visitor ${i + 1}.`);
    }
    attendees.push(age === undefined ? { name } : { name, age });
  }
  return attendees;
}

/**
 * Cancel a confirmed booking and return its seats.
 * Rule 4: capacity is restored exactly once — the status guard makes a repeat
 * cancel a no-op error rather than a second refund of seats.
 */
export function cancelBooking(bookingId: string, actor: User): Booking {
  const booking = db.bookings.find((b) => b.id === bookingId || b.reference === bookingId);
  if (!booking) throw new RuleError(404, "not_found", "We could not find that booking.");

  // USR-01: a devotee may only touch their own bookings.
  if (actor.role !== "admin" && booking.userId !== actor.id) {
    throw new RuleError(403, "forbidden", "You can only cancel your own bookings.");
  }
  if (booking.status === "cancelled") {
    throw new RuleError(409, "already_cancelled", "This booking was already cancelled.");
  }

  // --- critical section
  booking.status = "cancelled";
  booking.cancelledAt = now();
  const slot = findSlot(booking.slotId);
  if (slot) slot.bookedCount = Math.max(0, slot.bookedCount - booking.visitorCount);
  // --- end critical section

  return booking;
}

export interface BookingView extends Booking {
  devoteeName: string;
  eventTitle: string;
  venue: string;
  date: string;
  startTime: string;
  endTime: string;
}

/** Denormalised booking rows for the lists and dashboards. */
export function bookingViews(filter: { userId?: string; status?: BookingStatus; date?: string; search?: string } = {}): BookingView[] {
  const term = filter.search?.trim().toLowerCase();
  return db.bookings
    .filter((b) => (filter.userId ? b.userId === filter.userId : true))
    .filter((b) => (filter.status ? b.status === filter.status : true))
    .map((b) => {
      const slot = findSlot(b.slotId);
      const event = slot ? findEvent(slot.eventId) : undefined;
      const devotee = findUser(b.userId);
      return {
        ...b,
        devoteeName: devotee?.name ?? "Unknown devotee",
        eventTitle: event?.title ?? "Unknown event",
        venue: event?.venue ?? "",
        date: slot?.date ?? "",
        startTime: slot?.startTime ?? "",
        endTime: slot?.endTime ?? "",
      };
    })
    .filter((b) => (filter.date ? b.date === filter.date : true))
    // USR-02: admin search by devotee name or booking reference.
    .filter((b) =>
      term ? b.devoteeName.toLowerCase().includes(term) || b.reference.toLowerCase().includes(term) : true,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---------------------------------------------------------------------------
// Prasadam (PRA-01, PRA-02, PRA-03, PRA-04, PRA-05)
// ---------------------------------------------------------------------------

export function createItem(input: Record<string, unknown>, adminId: string): PrasadamItem {
  const stockRaw = Number(input.stock ?? 0);
  if (!Number.isInteger(stockRaw) || stockRaw < 0) {
    throw new RuleError(400, "invalid_number", "Opening stock must be a whole number of 0 or more.");
  }
  const reorderRaw = Number(input.reorderLevel ?? 0);
  if (!Number.isInteger(reorderRaw) || reorderRaw < 0) {
    throw new RuleError(400, "invalid_number", "Reorder level must be a whole number of 0 or more.");
  }
  const priceRaw = Number(input.displayPrice ?? 0);
  if (!Number.isFinite(priceRaw) || priceRaw < 0) {
    throw new RuleError(400, "invalid_number", "Display price must be zero or more.");
  }

  const item: PrasadamItem = {
    id: nextId("itm"),
    name: requireText(input.name, "Item name"),
    description: typeof input.description === "string" ? input.description.trim() : "",
    displayPrice: priceRaw,
    stock: stockRaw,
    reorderLevel: reorderRaw,
    active: input.active === undefined ? true : Boolean(input.active),
    createdAt: now(),
  };
  db.items.push(item);
  if (stockRaw > 0) {
    recordMovement(item.id, "restock", stockRaw, "Opening stock", adminId);
  }
  return item;
}

export function updateItem(itemId: string, patch: Record<string, unknown>): PrasadamItem {
  const item = findItem(itemId);
  if (!item) throw new RuleError(404, "not_found", "That prasadam item no longer exists.");

  if (patch.name !== undefined) item.name = requireText(patch.name, "Item name");
  if (patch.description !== undefined) item.description = String(patch.description ?? "").trim();
  if (patch.active !== undefined) item.active = Boolean(patch.active);
  if (patch.reorderLevel !== undefined) {
    const level = Number(patch.reorderLevel);
    if (!Number.isInteger(level) || level < 0) {
      throw new RuleError(400, "invalid_number", "Reorder level must be a whole number of 0 or more.");
    }
    item.reorderLevel = level;
  }
  if (patch.displayPrice !== undefined) {
    const price = Number(patch.displayPrice);
    if (!Number.isFinite(price) || price < 0) {
      throw new RuleError(400, "invalid_number", "Display price must be zero or more.");
    }
    item.displayPrice = price;
  }
  return item;
}

/** Admin stock adjustment. Rule 5: stock can never be driven below zero. */
export function adjustStock(itemId: string, delta: unknown, reason: unknown, adminId: string): PrasadamItem {
  const item = findItem(itemId);
  if (!item) throw new RuleError(404, "not_found", "That prasadam item no longer exists.");

  const change = Number(delta);
  if (!Number.isInteger(change) || change === 0) {
    throw new RuleError(400, "invalid_number", "Enter a whole number to add or remove. Use a negative number to remove stock.");
  }
  if (item.stock + change < 0) {
    throw new RuleError(
      409,
      "stock_negative",
      `Only ${item.stock} in stock, so ${Math.abs(change)} cannot be removed.`,
    );
  }

  // --- critical section
  item.stock += change;
  recordMovement(
    item.id,
    change > 0 ? "restock" : "adjust",
    change,
    typeof reason === "string" && reason.trim() ? reason.trim() : "Manual adjustment",
    adminId,
  );
  // --- end critical section

  return item;
}

function recordMovement(
  itemId: string,
  type: MovementType,
  quantity: number,
  reason: string,
  createdBy: string | null,
): void {
  db.movements.push({
    id: nextId("mov"),
    itemId,
    type,
    quantity,
    reason,
    createdBy,
    createdAt: now(),
  });
}

/** PRA-05: items at or below their reorder level. */
export function lowStockItems(): PrasadamItem[] {
  return db.items.filter((i) => i.stock <= i.reorderLevel);
}

/** Rule 6: inactive and out-of-stock items stay visible to admins only. */
export function visibleItems(role: Role): PrasadamItem[] {
  const items = [...db.items].sort((a, b) => a.name.localeCompare(b.name));
  return role === "admin" ? items : items.filter((i) => i.active);
}

export interface OrderLineInput {
  itemId?: unknown;
  quantity?: unknown;
}

export interface OrderView extends PrasadamOrder {
  devoteeName: string;
  lines: Array<{ itemId: string; name: string; quantity: number; displayPrice: number }>;
  totalQuantity: number;
  informationalTotal: number;
}

/**
 * Reserve prasadam. PRA-03 + Rule 5: every line is validated before any stock
 * moves, and the whole reduction happens in one synchronous critical section —
 * so an order either applies completely or not at all, and stock never goes
 * negative even under simultaneous requests.
 */
export function createOrder(userId: string, rawLines: unknown): { order: PrasadamOrder; view: OrderView } {
  const user = findUser(userId);
  if (!user) throw new RuleError(401, "no_session", "Please sign in again to continue.");

  const lines = Array.isArray(rawLines) ? (rawLines as OrderLineInput[]) : [];
  if (lines.length === 0) {
    throw new RuleError(400, "empty_order", "Please choose at least one prasadam item.");
  }

  // Phase 1 — validate everything, mutate nothing.
  const planned: Array<{ item: PrasadamItem; quantity: number }> = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const itemId = String(line.itemId ?? "");
    const item = findItem(itemId);
    if (!item) throw new RuleError(404, "not_found", "One of the items is no longer available.");
    if (seen.has(itemId)) {
      throw new RuleError(400, "duplicate_item", `${item.name} is listed twice. Please combine it into one quantity.`);
    }
    seen.add(itemId);

    const quantity = requirePositiveInt(line.quantity, `Quantity for ${item.name}`);
    // Rule 6: devotees cannot reserve inactive items.
    if (!item.active) {
      throw new RuleError(409, "item_inactive", `${item.name} is not available for reservation right now.`);
    }
    // PRA-02 + Rule 5: never more than available stock.
    if (quantity > item.stock) {
      throw new RuleError(
        409,
        "insufficient_stock",
        item.stock === 0
          ? `${item.name} is out of stock. Please remove it to continue.`
          : `Only ${item.stock} of ${item.name} left. Please reduce the quantity.`,
      );
    }
    planned.push({ item, quantity });
  }

  // Phase 2 — critical section: apply all of it with no yield point.
  const order: PrasadamOrder = {
    id: nextId("ord"),
    reference: nextOrderRef(), // PRA-03: unique order reference.
    userId,
    status: "confirmed",
    createdAt: now(),
  };
  db.orders.push(order);
  for (const { item, quantity } of planned) {
    item.stock -= quantity;
    db.orderItems.push({
      id: nextId("oit"),
      orderId: order.id,
      itemId: item.id,
      quantity,
      displayPrice: item.displayPrice,
    });
    recordMovement(item.id, "reserve", -quantity, `Order ${order.reference}`, userId);
  }
  // --- end critical section

  return { order, view: orderView(order) };
}

export function orderView(order: PrasadamOrder): OrderView {
  const lines = db.orderItems
    .filter((oi) => oi.orderId === order.id)
    .map((oi) => ({
      itemId: oi.itemId,
      name: findItem(oi.itemId)?.name ?? "Unknown item",
      quantity: oi.quantity,
      displayPrice: oi.displayPrice,
    }));
  return {
    ...order,
    devoteeName: findUser(order.userId)?.name ?? "Unknown devotee",
    lines,
    totalQuantity: lines.reduce((n, l) => n + l.quantity, 0),
    // Rule 7: informational only, never charged.
    informationalTotal: lines.reduce((n, l) => n + l.quantity * l.displayPrice, 0),
  };
}

export function orderViews(filter: { userId?: string; status?: OrderStatus; search?: string } = {}): OrderView[] {
  const term = filter.search?.trim().toLowerCase();
  return db.orders
    .filter((o) => (filter.userId ? o.userId === filter.userId : true))
    .filter((o) => (filter.status ? o.status === filter.status : true))
    .map(orderView)
    .filter((o) =>
      term ? o.devoteeName.toLowerCase().includes(term) || o.reference.toLowerCase().includes(term) : true,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** PRA-04: Confirmed → Ready → Fulfilled, one step at a time, never backwards. */
export function advanceOrder(orderId: string, target: unknown): OrderView {
  const order = db.orders.find((o) => o.id === orderId || o.reference === orderId);
  if (!order) throw new RuleError(404, "not_found", "We could not find that order.");

  const next = String(target ?? "") as OrderStatus;
  if (!ORDER_FLOW.includes(next)) {
    throw new RuleError(400, "invalid_status", "That is not a valid order status.");
  }
  const from = ORDER_FLOW.indexOf(order.status);
  const to = ORDER_FLOW.indexOf(next);
  if (to === from) {
    throw new RuleError(409, "already_in_status", `This order is already ${next}.`);
  }
  if (to < from) {
    throw new RuleError(409, "no_going_back", `An order that is ${order.status} cannot go back to ${next}.`);
  }
  if (to > from + 1) {
    throw new RuleError(
      409,
      "skips_step",
      `Please move this order to ${ORDER_FLOW[from + 1]} first.`,
    );
  }
  order.status = next;
  return orderView(order);
}

// ---------------------------------------------------------------------------
// Dashboard (DASH-01)
// ---------------------------------------------------------------------------

export function dashboard() {
  const day = today();
  const todaysBookings = bookingViews({ status: "confirmed", date: day });
  const upcomingSlots = db.slots.filter((s) => s.date >= day);
  const capacity = upcomingSlots.reduce((n, s) => n + s.capacity, 0);
  const booked = upcomingSlots.reduce((n, s) => n + s.bookedCount, 0);

  const recentBookings = bookingViews().slice(0, 5).map((b) => ({
    kind: "booking" as const,
    at: b.createdAt,
    reference: b.reference,
    label: `${b.devoteeName} booked ${b.visitorCount} place(s) for ${b.eventTitle}`,
    status: b.status as string,
  }));
  const recentOrders = orderViews().slice(0, 5).map((o) => ({
    kind: "order" as const,
    at: o.createdAt,
    reference: o.reference,
    label: `${o.devoteeName} reserved ${o.totalQuantity} prasadam item(s)`,
    status: o.status as string,
  }));

  return {
    date: day,
    todaysBookingCount: todaysBookings.length,
    expectedVisitorsToday: todaysBookings.reduce((n, b) => n + b.visitorCount, 0),
    upcomingEvents: db.events
      .filter((e) => e.status === "published" && e.endDate >= day)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((e) => ({ ...e, ...eventCapacity(e.id) })),
    slotUtilisation: {
      capacity,
      booked,
      percent: capacity === 0 ? 0 : Math.round((booked / capacity) * 100),
    },
    prasadamOrders: {
      confirmed: db.orders.filter((o) => o.status === "confirmed").length,
      ready: db.orders.filter((o) => o.status === "ready").length,
      fulfilled: db.orders.filter((o) => o.status === "fulfilled").length,
    },
    lowStock: lowStockItems().map((i) => ({
      id: i.id,
      name: i.name,
      stock: i.stock,
      reorderLevel: i.reorderLevel,
      active: i.active,
    })),
    recentActivity: [...recentBookings, ...recentOrders]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 8),
  };
}

// ---------------------------------------------------------------------------
// Seed — fictional demo data only, no real personal data (PRD section 7).
// ---------------------------------------------------------------------------

export function seed(): void {
  const mkUser = (name: string, role: Role, mobile: string, email: string): User => {
    const user: User = {
      id: nextId("usr"),
      name,
      mobile,
      email,
      role,
      status: "active",
      createdAt: now(),
    };
    db.users.push(user);
    // Staff sign-in needs a password; the demo one is derived from their name.
    if (role === "admin") staffPasswords.set(user.id, demoPasswordFor(name));
    return user;
  };

  const admin = mkUser("Temple Admin", "admin", "+91 90000 00001", "admin@temple.example");
  mkUser("Lakshmi Iyer", "admin", "+91 90000 00002", "lakshmi@temple.example");
  const ravi = mkUser("Ravi Kumar", "devotee", "+91 98765 43210", "ravi@example.com");
  const meera = mkUser("Meera Nair", "devotee", "+91 98765 43211", "meera@example.com");
  mkUser("Arjun Desai", "devotee", "+91 98765 43212", "arjun@example.com");

  // Published event with slots across today and the next two days.
  const brahmotsavam = createEvent({
    title: "Brahmotsavam Morning Darshan",
    description: "Daily morning darshan during the annual Brahmotsavam festival.",
    venue: "Main Sanctum",
    startDate: today(),
    endDate: addDays(2),
  });
  for (const date of [today(), addDays(1), addDays(2)]) {
    createSlot(brahmotsavam.id, { date, startTime: "06:00", endTime: "07:30", capacity: 40 });
    createSlot(brahmotsavam.id, { date, startTime: "07:30", endTime: "09:00", capacity: 40 });
    createSlot(brahmotsavam.id, { date, startTime: "17:00", endTime: "18:30", capacity: 25 });
  }
  updateEvent(brahmotsavam.id, { status: "published" });

  const abhishekam = createEvent({
    title: "Weekend Special Abhishekam",
    description: "Guided abhishekam viewing with limited seating.",
    venue: "East Hall",
    startDate: addDays(3),
    endDate: addDays(4),
  });
  createSlot(abhishekam.id, { date: addDays(3), startTime: "08:00", endTime: "09:00", capacity: 12 });
  createSlot(abhishekam.id, { date: addDays(4), startTime: "08:00", endTime: "09:00", capacity: 12 });
  updateEvent(abhishekam.id, { status: "published" });

  // A draft event, to prove devotees never see unpublished events (DAR-03).
  const draft = createEvent({
    title: "Deepavali Night Darshan",
    description: "Special late-evening darshan. Schedule still being finalised.",
    venue: "Main Sanctum",
    startDate: addDays(20),
    endDate: addDays(21),
  });
  createSlot(draft.id, { date: addDays(20), startTime: "19:00", endTime: "20:30", capacity: 60 });

  // Prasadam: a healthy item, one at its reorder level, one out of stock,
  // and one deactivated — so PRA-05 and Rule 6 are visible in the demo.
  createItem(
    { name: "Laddu", description: "Traditional besan laddu, box of 2.", displayPrice: 50, stock: 120, reorderLevel: 25 },
    admin.id,
  );
  createItem(
    { name: "Pongal", description: "Savoury rice and lentil prasadam.", displayPrice: 30, stock: 18, reorderLevel: 20 },
    admin.id,
  );
  createItem(
    { name: "Panchamrutham", description: "Five-ingredient sweet offering.", displayPrice: 40, stock: 0, reorderLevel: 10 },
    admin.id,
  );
  createItem(
    { name: "Vada Malai", description: "Seasonal garland offering.", displayPrice: 250, stock: 8, reorderLevel: 2, active: false },
    admin.id,
  );

  // A couple of existing bookings so the dashboard is not empty on first load.
  const firstSlot = slotsForEvent(brahmotsavam.id)[0];
  if (firstSlot) {
    createBooking(ravi.id, {
      slotId: firstSlot.id,
      visitorCount: 2,
      attendeeDetails: [{ name: "Ravi Kumar", age: 41 }, { name: "Sita Kumar", age: 38 }],
    });
    createBooking(meera.id, {
      slotId: firstSlot.id,
      visitorCount: 1,
      attendeeDetails: [{ name: "Meera Nair", age: 29 }],
    });
  }
}
