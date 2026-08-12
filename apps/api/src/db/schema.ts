import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgSequence,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export type Role = "devotee" | "admin";
export type UserStatus = "active" | "inactive";
export type EventStatus = "draft" | "published" | "completed" | "cancelled";
export type SlotStatus = "open" | "closed";
export type BookingStatus = "confirmed" | "cancelled";
export type OrderStatus = "confirmed" | "ready" | "fulfilled";
export type MovementType = "reserve" | "release" | "restock" | "adjust";

export const bookingReferenceSequence = pgSequence("booking_ref_seq", {
  startWith: 1001,
});
export const orderReferenceSequence = pgSequence("order_ref_seq", {
  startWith: 5001,
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    mobile: text("mobile"),
    email: text("email"),
    role: text("role").$type<Role>().notNull(),
    status: text("status").$type<UserStatus>().default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("users_role_check", sql`${table.role} IN ('devotee', 'admin')`),
    check("users_status_check", sql`${table.status} IN ('active', 'inactive')`),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description").default("").notNull(),
    venue: text("venue").default("").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: text("status").$type<EventStatus>().default("draft").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "events_status_check",
      sql`${table.status} IN ('draft', 'published', 'completed', 'cancelled')`,
    ),
    check("events_date_order", sql`${table.endDate} >= ${table.startDate}`),
  ],
);

export const slots = pgTable(
  "slots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    capacity: integer("capacity").notNull(),
    bookedCount: integer("booked_count").default(0).notNull(),
    status: text("status").$type<SlotStatus>().default("open").notNull(),
  },
  (table) => [
    check("slots_capacity_check", sql`${table.capacity} > 0`),
    check("slots_status_check", sql`${table.status} IN ('open', 'closed')`),
    check(
      "slots_booked_within_capacity",
      sql`${table.bookedCount} >= 0 AND ${table.bookedCount} <= ${table.capacity}`,
    ),
    check("slots_time_order", sql`${table.endTime} > ${table.startTime}`),
    index("slots_event_id_idx").on(table.eventId),
  ],
);

export type AttendeeDetail = { name: string; age?: number };

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reference: text("reference")
      .default(sql`'DSN-' || lpad(nextval('booking_ref_seq')::text, 5, '0')`)
      .notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    slotId: uuid("slot_id")
      .notNull()
      .references(() => slots.id),
    visitorCount: integer("visitor_count").notNull(),
    attendeeDetails: jsonb("attendee_details")
      .$type<AttendeeDetail[]>()
      .default([])
      .notNull(),
    status: text("status")
      .$type<BookingStatus>()
      .default("confirmed")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("bookings_reference_key").on(table.reference),
    check(
      "bookings_status_check",
      sql`${table.status} IN ('confirmed', 'cancelled')`,
    ),
    check(
      "bookings_visitor_count_range",
      sql`${table.visitorCount} > 0 AND ${table.visitorCount} <= 6`,
    ),
    index("bookings_slot_id_idx").on(table.slotId),
    index("bookings_user_id_idx").on(table.userId),
  ],
);

export const prasadamItems = pgTable(
  "prasadam_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description").default("").notNull(),
    displayPrice: numeric("display_price", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    stock: integer("stock").notNull(),
    reorderLevel: integer("reorder_level").default(0).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("prasadam_items_stock_check", sql`${table.stock} >= 0`),
    check(
      "prasadam_items_reorder_level_check",
      sql`${table.reorderLevel} >= 0`,
    ),
  ],
);

export const prasadamOrders = pgTable(
  "prasadam_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reference: text("reference")
      .default(sql`'PRS-' || lpad(nextval('order_ref_seq')::text, 5, '0')`)
      .notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    status: text("status")
      .$type<OrderStatus>()
      .default("confirmed")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("prasadam_orders_reference_key").on(table.reference),
    check(
      "prasadam_orders_status_check",
      sql`${table.status} IN ('confirmed', 'ready', 'fulfilled')`,
    ),
    index("prasadam_orders_user_id_idx").on(table.userId),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => prasadamOrders.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => prasadamItems.id),
    quantity: integer("quantity").notNull(),
    displayPrice: numeric("display_price", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
  },
  (table) => [
    check("order_items_quantity_check", sql`${table.quantity} > 0`),
    index("order_items_order_id_idx").on(table.orderId),
  ],
);

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => prasadamItems.id, { onDelete: "cascade" }),
    type: text("type").$type<MovementType>().notNull(),
    quantity: integer("quantity").notNull(),
    reason: text("reason").default("").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "inventory_movements_type_check",
      sql`${table.type} IN ('reserve', 'release', 'restock', 'adjust')`,
    ),
    index("inventory_movements_item_id_idx").on(table.itemId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  orders: many(prasadamOrders),
  inventoryMovements: many(inventoryMovements),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  slots: many(slots),
}));

export const slotsRelations = relations(slots, ({ one, many }) => ({
  event: one(events, { fields: [slots.eventId], references: [events.id] }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
  slot: one(slots, { fields: [bookings.slotId], references: [slots.id] }),
}));

export const prasadamItemsRelations = relations(prasadamItems, ({ many }) => ({
  orderItems: many(orderItems),
  inventoryMovements: many(inventoryMovements),
}));

export const prasadamOrdersRelations = relations(
  prasadamOrders,
  ({ one, many }) => ({
    user: one(users, { fields: [prasadamOrders.userId], references: [users.id] }),
    items: many(orderItems),
  }),
);

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(prasadamOrders, {
    fields: [orderItems.orderId],
    references: [prasadamOrders.id],
  }),
  item: one(prasadamItems, {
    fields: [orderItems.itemId],
    references: [prasadamItems.id],
  }),
}));

export const inventoryMovementsRelations = relations(
  inventoryMovements,
  ({ one }) => ({
    item: one(prasadamItems, {
      fields: [inventoryMovements.itemId],
      references: [prasadamItems.id],
    }),
    createdByUser: one(users, {
      fields: [inventoryMovements.createdBy],
      references: [users.id],
    }),
  }),
);
