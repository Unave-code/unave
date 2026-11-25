import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Product add-ons (docs/addons/product-addons-flow.pdf), and the meal plan menu
 * dated by the calendar.
 *
 * Creates the `addons` collection, the `products_rels` table that holds each
 * product's chosen add-ons, and the add-on snapshot on checkout intent and order
 * items, with the product's own price beside it. Every new column is nullable,
 * so old rows stay valid without a backfill.
 *
 * The meal plan menu's typed "Dates" field left the admin (the page now dates the
 * menu to the current week itself). Its column, meal_plans.this_week_range, is
 * left in place, unused, so this migration removes nothing.
 *
 * Every step is guarded, because a database managed by dev push may already hold
 * some of this.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "addons" (
     "id" serial PRIMARY KEY NOT NULL,
     "title" varchar NOT NULL,
     "note" varchar,
     "price" numeric NOT NULL,
     "available" boolean DEFAULT true,
     "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
     "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
   );
   CREATE INDEX IF NOT EXISTS "addons_updated_at_idx" ON "addons" USING btree ("updated_at");
   CREATE INDEX IF NOT EXISTS "addons_created_at_idx" ON "addons" USING btree ("created_at");

   CREATE TABLE IF NOT EXISTS "products_rels" (
     "id" serial PRIMARY KEY NOT NULL,
     "order" integer,
     "parent_id" integer NOT NULL,
     "path" varchar NOT NULL,
     "addons_id" integer
   );
   ALTER TABLE "products_rels" ADD COLUMN IF NOT EXISTS "addons_id" integer;
   CREATE INDEX IF NOT EXISTS "products_rels_order_idx" ON "products_rels" USING btree ("order");
   CREATE INDEX IF NOT EXISTS "products_rels_parent_idx" ON "products_rels" USING btree ("parent_id");
   CREATE INDEX IF NOT EXISTS "products_rels_path_idx" ON "products_rels" USING btree ("path");
   CREATE INDEX IF NOT EXISTS "products_rels_addons_id_idx" ON "products_rels" USING btree ("addons_id");

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_rels_parent_fk') THEN
       ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_parent_fk"
         FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_rels_addons_fk') THEN
       ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_addons_fk"
         FOREIGN KEY ("addons_id") REFERENCES "public"."addons"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   ALTER TABLE "checkout_intents_items" ADD COLUMN IF NOT EXISTS "base_price" numeric;
   CREATE TABLE IF NOT EXISTS "checkout_intents_items_addons" (
     "_order" integer NOT NULL,
     "_parent_id" varchar NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "addon_ref_id" integer,
     "addon_id" numeric NOT NULL,
     "title" varchar NOT NULL,
     "price" numeric NOT NULL
   );
   CREATE INDEX IF NOT EXISTS "checkout_intents_items_addons_order_idx" ON "checkout_intents_items_addons" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "checkout_intents_items_addons_parent_id_idx" ON "checkout_intents_items_addons" USING btree ("_parent_id");
   CREATE INDEX IF NOT EXISTS "checkout_intents_items_addons_addon_ref_idx" ON "checkout_intents_items_addons" USING btree ("addon_ref_id");

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checkout_intents_items_addons_parent_id_fk') THEN
       ALTER TABLE "checkout_intents_items_addons" ADD CONSTRAINT "checkout_intents_items_addons_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."checkout_intents_items"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checkout_intents_items_addons_addon_ref_id_addons_id_fk') THEN
       ALTER TABLE "checkout_intents_items_addons" ADD CONSTRAINT "checkout_intents_items_addons_addon_ref_id_addons_id_fk"
         FOREIGN KEY ("addon_ref_id") REFERENCES "public"."addons"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   ALTER TABLE "orders_items" ADD COLUMN IF NOT EXISTS "base_price" numeric;
   CREATE TABLE IF NOT EXISTS "orders_items_addons" (
     "_order" integer NOT NULL,
     "_parent_id" varchar NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "addon_id" integer,
     "title" varchar NOT NULL,
     "price" numeric NOT NULL
   );
   CREATE INDEX IF NOT EXISTS "orders_items_addons_order_idx" ON "orders_items_addons" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "orders_items_addons_parent_id_idx" ON "orders_items_addons" USING btree ("_parent_id");
   CREATE INDEX IF NOT EXISTS "orders_items_addons_addon_idx" ON "orders_items_addons" USING btree ("addon_id");

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_items_addons_parent_id_fk') THEN
       ALTER TABLE "orders_items_addons" ADD CONSTRAINT "orders_items_addons_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."orders_items"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_items_addons_addon_id_addons_id_fk') THEN
       ALTER TABLE "orders_items_addons" ADD CONSTRAINT "orders_items_addons_addon_id_addons_id_fk"
         FOREIGN KEY ("addon_id") REFERENCES "public"."addons"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "addons_id" integer;
   CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_addons_id_idx" ON "payload_locked_documents_rels" USING btree ("addons_id");

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_addons_fk') THEN
       ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_addons_fk"
         FOREIGN KEY ("addons_id") REFERENCES "public"."addons"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   ALTER TABLE "payload_preferences_rels" ADD COLUMN IF NOT EXISTS "addons_id" integer;
   CREATE INDEX IF NOT EXISTS "payload_preferences_rels_addons_id_idx" ON "payload_preferences_rels" USING btree ("addons_id");

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_preferences_rels_addons_fk') THEN
       ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_addons_fk"
         FOREIGN KEY ("addons_id") REFERENCES "public"."addons"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT IF EXISTS "payload_preferences_rels_addons_fk";
   ALTER TABLE "payload_preferences_rels" DROP COLUMN IF EXISTS "addons_id";
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_addons_fk";
   ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "addons_id";

   DROP TABLE IF EXISTS "orders_items_addons";
   ALTER TABLE "orders_items" DROP COLUMN IF EXISTS "base_price";
   DROP TABLE IF EXISTS "checkout_intents_items_addons";
   ALTER TABLE "checkout_intents_items" DROP COLUMN IF EXISTS "base_price";
   DROP TABLE IF EXISTS "products_rels";
   DROP TABLE IF EXISTS "addons";
  `)
}
