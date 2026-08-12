/**
 * Source of truth for entity shapes, mirrored verbatim at
 * apps/web/src/lib/types.ts — edit both together.
 *
 * Status enums follow CONTRACT.md section 2. Only the auth module is
 * implemented, so User is the only entity declared here; Event, Slot, Booking,
 * PrasadamItem, PrasadamOrder, OrderItem and InventoryMovement belong with
 * those lanes.
 */

export type Role = 'devotee' | 'admin'
export type UserStatus = 'active' | 'inactive'
export type EventStatus = 'draft' | 'published' | 'completed' | 'cancelled'
export type SlotStatus = 'open' | 'closed'
export type BookingStatus = 'confirmed' | 'cancelled'
export type OrderStatus = 'confirmed' | 'ready' | 'fulfilled'
export type MovementType = 'reserve' | 'release' | 'restock' | 'adjust'

/** Rule 3. */
export const MAX_VISITORS_PER_BOOKING = 6

/** PRA-04: forward only, one step at a time. */
export const ORDER_FLOW: OrderStatus[] = ['confirmed', 'ready', 'fulfilled']

export interface User {
  id: string
  name: string
  mobile: string | null
  email: string | null
  role: Role
  status: UserStatus
  createdAt: string
}
