// Entities and status enums mirror the data model in the Buildathon PRD (section 6).
// Kept as a standalone module so the web app can copy these shapes verbatim.

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

export interface OrderItem {
  id: string;
  orderId: string;
  itemId: string;
  quantity: number;
  displayPrice: number;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  type: MovementType;
  quantity: number;
  reason: string;
  createdBy: string | null;
  createdAt: string;
}
