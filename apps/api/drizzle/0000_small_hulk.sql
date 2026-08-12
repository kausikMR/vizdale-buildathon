CREATE SEQUENCE IF NOT EXISTS "public"."booking_ref_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1001 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS "public"."order_ref_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 5001 CACHE 1;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text DEFAULT 'DSN-' || lpad(nextval('booking_ref_seq')::text, 5, '0') NOT NULL,
	"user_id" uuid NOT NULL,
	"slot_id" uuid NOT NULL,
	"visitor_count" integer NOT NULL,
	"attendee_details" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_reference_key" UNIQUE("reference"),
	CONSTRAINT "bookings_status_check" CHECK ("bookings"."status" IN ('confirmed', 'cancelled')),
	CONSTRAINT "bookings_visitor_count_range" CHECK ("bookings"."visitor_count" > 0 AND "bookings"."visitor_count" <= 6)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"venue" text DEFAULT '' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_status_check" CHECK ("events"."status" IN ('draft', 'published', 'completed', 'cancelled')),
	CONSTRAINT "events_date_order" CHECK ("events"."end_date" >= "events"."start_date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_movements_type_check" CHECK ("inventory_movements"."type" IN ('reserve', 'release', 'restock', 'adjust'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"display_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	CONSTRAINT "order_items_quantity_check" CHECK ("order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prasadam_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"display_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"stock" integer NOT NULL,
	"reorder_level" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prasadam_items_stock_check" CHECK ("prasadam_items"."stock" >= 0),
	CONSTRAINT "prasadam_items_reorder_level_check" CHECK ("prasadam_items"."reorder_level" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prasadam_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text DEFAULT 'PRS-' || lpad(nextval('order_ref_seq')::text, 5, '0') NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prasadam_orders_reference_key" UNIQUE("reference"),
	CONSTRAINT "prasadam_orders_status_check" CHECK ("prasadam_orders"."status" IN ('confirmed', 'ready', 'fulfilled'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"capacity" integer NOT NULL,
	"booked_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	CONSTRAINT "slots_capacity_check" CHECK ("slots"."capacity" > 0),
	CONSTRAINT "slots_status_check" CHECK ("slots"."status" IN ('open', 'closed')),
	CONSTRAINT "slots_booked_within_capacity" CHECK ("slots"."booked_count" >= 0 AND "slots"."booked_count" <= "slots"."capacity"),
	CONSTRAINT "slots_time_order" CHECK ("slots"."end_time" > "slots"."start_time")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"mobile" text,
	"email" text,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_role_check" CHECK ("users"."role" IN ('devotee', 'admin')),
	CONSTRAINT "users_status_check" CHECK ("users"."status" IN ('active', 'inactive'))
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('bookings_user_id_fkey', 'bookings_user_id_users_id_fk')) THEN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('bookings_slot_id_fkey', 'bookings_slot_id_slots_id_fk')) THEN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."slots"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('inventory_movements_item_id_fkey', 'inventory_movements_item_id_prasadam_items_id_fk')) THEN
    ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_item_id_prasadam_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."prasadam_items"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('inventory_movements_created_by_fkey', 'inventory_movements_created_by_users_id_fk')) THEN
    ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('order_items_order_id_fkey', 'order_items_order_id_prasadam_orders_id_fk')) THEN
    ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_prasadam_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."prasadam_orders"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('order_items_item_id_fkey', 'order_items_item_id_prasadam_items_id_fk')) THEN
    ALTER TABLE "order_items" ADD CONSTRAINT "order_items_item_id_prasadam_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."prasadam_items"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('prasadam_orders_user_id_fkey', 'prasadam_orders_user_id_users_id_fk')) THEN
    ALTER TABLE "prasadam_orders" ADD CONSTRAINT "prasadam_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('slots_event_id_fkey', 'slots_event_id_events_id_fk')) THEN
    ALTER TABLE "slots" ADD CONSTRAINT "slots_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_slot_id_idx" ON "bookings" USING btree ("slot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_user_id_idx" ON "bookings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_movements_item_id_idx" ON "inventory_movements" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prasadam_orders_user_id_idx" ON "prasadam_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slots_event_id_idx" ON "slots" USING btree ("event_id");
