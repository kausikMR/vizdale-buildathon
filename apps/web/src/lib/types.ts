// Mirror of apps/api/src/types.ts — edit both together.
// The `*View` types below are the enriched shapes the API actually returns:
// derived values are computed server-side so no screen re-implements a rule.

export type Role = "devotee" | "admin";
export type UserStatus = "active" | "inactive";
export type EventStatus = "draft" | "published" | "completed" | "cancelled";
export type SlotStatus = "open" | "closed";
export type BookingStatus = "confirmed" | "cancelled";
export type OrderStatus = "confirmed" | "ready" | "fulfilled";
export type MovementType = "reserve" | "release" | "restock" | "adjust";

/** Order statuses in their only legal progression (PRA-04). */
export const ORDER_FLOW: OrderStatus[] = ["confirmed", "ready", "fulfilled"];

/** Rule 3: visitor count is a positive whole number, at most 6 per booking. */
export const MAX_VISITORS_PER_BOOKING = 6;

export interface User {
  id: string;
  name: string;
  mobile: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  venue: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: EventStatus;
  createdAt: string;
}

export interface Slot {
  id: string;
  eventId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  capacity: number;
  bookedCount: number;
  status: SlotStatus;
}

export interface Attendee {
  name: string;
  age?: number;
}

export interface Booking {
  id: string;
  reference: string;
  userId: string;
  slotId: string;
  visitorCount: number;
  attendeeDetails: Attendee[];
  status: BookingStatus;
  createdAt: string;
  cancelledAt: string | null;
}

export interface PrasadamItem {
  id: string;
  name: string;
  description: string;
  /** Rule 7: informational only. Never charged, and labelled as such in the UI. */
  displayPrice: number;
  stock: number;
  reorderLevel: number;
  active: boolean;
  createdAt: string;
}

export interface PrasadamOrder {
  id: string;
  reference: string;
  userId: string;
  status: OrderStatus;
  createdAt: string;
}

// --------------------------------------------------------------- server views

/** Slot plus the derived capacity facts. Never recompute these in a component. */
export interface SlotView extends Slot {
  /** Rule 1: capacity - bookedCount, never below zero. */
  remaining: number;
  /** DAR-03: event published, slot open, date not passed, seats left. */
  bookable: boolean;
}

export interface EventView extends Event {
  capacity: number;
  booked: number;
  /** Devotees receive only bookable slots; admins receive all of them. */
  slots: SlotView[];
}

export interface BookingView extends Booking {
  devoteeName: string;
  eventTitle: string;
  venue: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface ItemView extends PrasadamItem {
  /** Rule 6: active and in stock. */
  reservable: boolean;
  /** PRA-05: at or below the reorder level. */
  lowStock: boolean;
}

export interface OrderLineView {
  itemId: string;
  name: string;
  quantity: number;
  displayPrice: number;
}

export interface OrderView extends PrasadamOrder {
  devoteeName: string;
  lines: OrderLineView[];
  totalQuantity: number;
  /** Rule 7: shown only as an informational figure, never collected. */
  informationalTotal: number;
}

/** Offered as one-tap sign-in on the simulated sign-in screen. */
export interface KnownUser {
  id: string;
  name: string;
  role: Role;
}

/** Every failure from the API arrives in this shape (EXP-01). */
export interface ApiError {
  error: {
    code: string;
    /** Already devotee-facing and actionable — render it verbatim. */
    message: string;
  };
}
