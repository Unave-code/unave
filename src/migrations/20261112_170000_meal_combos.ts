import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Meal combos, the private checkout intent and the combo audit trail (spec 0010).
 *
 * A combo is a product like any other, so the catalogue only gains one enum
 * value and one child table for its contents: `products_components` holds two
 * to ten references to other products, plus the snapshots the admin keeps so a
 * deleted product still reads as itself in an audit record.
 *
 * Orders gain `orders_items_components`: the frozen copy of what a combo
 * contained at the moment it was paid, so later product edits never rewrite a
 * past order.
 *
 * `checkout_intents` is the temporary private record that carries a verified
 * checkout from the payment step to whichever payment signal arrives first.
 * It replaces the checkout notes that used to ride the gateway order, because
 * those have a size limit and a combo basket outgrows it. It is not an order:
 * no row exists here after a paid order is written.
 *
 * `combo_audit_logs` is append only: who changed a combo, when, and the before
 * and after snapshots.
 *
 * Every step is guarded. Development pushes its own schema with the dev server
 * and is never migrated, so on that database these tables and columns may
 * already exist; `ADD CONSTRAINT` has no `IF NOT EXISTS`, so each one is added
 * inside a `DO` block that checks `pg_constraint` first.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_products_type" ADD VALUE IF NOT EXISTS 'combo';

   CREATE TABLE IF NOT EXISTS "products_components" (
     "_order" integer NOT NULL,
     "_parent_id" integer NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "product_id" integer,
     "product_title_snapshot" varchar,
     "duration_label" varchar,
     "duration_days_snapshot" numeric
   );

   CREATE TABLE IF NOT EXISTS "orders_items_components" (
     "_order" integer NOT NULL,
     "_parent_id" varchar NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "product_id" integer,
     "product_title" varchar,
     "duration_label" varchar,
     "days" numeric
   );

   CREATE TABLE IF NOT EXISTS "checkout_intents" (
     "id" serial PRIMARY KEY NOT NULL,
     "gateway_order_id" varchar NOT NULL,
     "customer_id" integer NOT NULL,
     "delivery_name" varchar NOT NULL,
     "delivery_phone" varchar NOT NULL,
     "delivery_address_line1" varchar NOT NULL,
     "delivery_address_line2" varchar,
     "delivery_city" varchar NOT NULL,
     "delivery_state" varchar NOT NULL,
     "delivery_pincode" varchar NOT NULL,
     "delivery_food_preference" varchar NOT NULL,
     "delivery_note" varchar,
     "total" numeric NOT NULL,
     "expires_at" timestamp (3) with time zone NOT NULL,
     "updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
     "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
   );

   CREATE TABLE IF NOT EXISTS "checkout_intents_items" (
     "_order" integer NOT NULL,
     "_parent_id" integer NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "product_ref_id" integer,
     "product_id" numeric NOT NULL,
     "product_title" varchar NOT NULL,
     "duration_label" varchar NOT NULL,
     "days" numeric NOT NULL,
     "qty" numeric NOT NULL,
     "unit_price" numeric NOT NULL
   );

   CREATE TABLE IF NOT EXISTS "checkout_intents_items_components" (
     "_order" integer NOT NULL,
     "_parent_id" varchar NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "product_ref_id" integer,
     "product_id" numeric NOT NULL,
     "product_title" varchar NOT NULL,
     "duration_label" varchar,
     "days" numeric
   );

   DO $$ BEGIN
     CREATE TYPE "public"."enum_combo_audit_logs_action" AS ENUM('created', 'updated', 'deleted');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;

   CREATE TABLE IF NOT EXISTS "combo_audit_logs" (
     "id" serial PRIMARY KEY NOT NULL,
     "actor_id" integer NOT NULL,
     "action" "public"."enum_combo_audit_logs_action" NOT NULL,
     "combo_id" integer,
     "before" jsonb,
     "after" jsonb,
     "updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
     "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
   );

   CREATE INDEX IF NOT EXISTS "products_components_order_idx" ON "products_components" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "products_components_parent_id_idx" ON "products_components" USING btree ("_parent_id");
   CREATE INDEX IF NOT EXISTS "products_components_product_idx" ON "products_components" USING btree ("product_id");

   CREATE INDEX IF NOT EXISTS "orders_items_components_order_idx" ON "orders_items_components" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "orders_items_components_parent_id_idx" ON "orders_items_components" USING btree ("_parent_id");
   CREATE INDEX IF NOT EXISTS "orders_items_components_product_idx" ON "orders_items_components" USING btree ("product_id");

   CREATE UNIQUE INDEX IF NOT EXISTS "checkout_intents_gateway_order_id_idx" ON "checkout_intents" USING btree ("gateway_order_id");
   CREATE INDEX IF NOT EXISTS "checkout_intents_customer_idx" ON "checkout_intents" USING btree ("customer_id");
   CREATE INDEX IF NOT EXISTS "checkout_intents_expires_at_idx" ON "checkout_intents" USING btree ("expires_at");
   CREATE INDEX IF NOT EXISTS "checkout_intents_created_at_idx" ON "checkout_intents" USING btree ("created_at");
   CREATE INDEX IF NOT EXISTS "checkout_intents_updated_at_idx" ON "checkout_intents" USING btree ("updated_at");

   CREATE INDEX IF NOT EXISTS "checkout_intents_items_order_idx" ON "checkout_intents_items" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "checkout_intents_items_parent_id_idx" ON "checkout_intents_items" USING btree ("_parent_id");
   CREATE INDEX IF NOT EXISTS "checkout_intents_items_product_ref_idx" ON "checkout_intents_items" USING btree ("product_ref_id");

   CREATE INDEX IF NOT EXISTS "checkout_intents_items_components_order_idx" ON "checkout_intents_items_components" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "checkout_intents_items_components_parent_id_idx" ON "checkout_intents_items_components" USING btree ("_parent_id");
   CREATE INDEX IF NOT EXISTS "checkout_intents_items_components_product_ref_idx" ON "checkout_intents_items_components" USING btree ("product_ref_id");

   CREATE INDEX IF NOT EXISTS "combo_audit_logs_actor_idx" ON "combo_audit_logs" USING btree ("actor_id");
   CREATE INDEX IF NOT EXISTS "combo_audit_logs_combo_idx" ON "combo_audit_logs" USING btree ("combo_id");
   CREATE INDEX IF NOT EXISTS "combo_audit_logs_created_at_idx" ON "combo_audit_logs" USING btree ("created_at");
   CREATE INDEX IF NOT EXISTS "combo_audit_logs_updated_at_idx" ON "combo_audit_logs" USING btree ("updated_at");

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'products_components_parent_id_fk'
     ) THEN
       ALTER TABLE "products_components" ADD CONSTRAINT "products_components_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'products_components_product_id_products_id_fk'
     ) THEN
       ALTER TABLE "products_components" ADD CONSTRAINT "products_components_product_id_products_id_fk"
         FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'orders_items_components_parent_id_fk'
     ) THEN
       ALTER TABLE "orders_items_components" ADD CONSTRAINT "orders_items_components_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."orders_items"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'orders_items_components_product_id_products_id_fk'
     ) THEN
       ALTER TABLE "orders_items_components" ADD CONSTRAINT "orders_items_components_product_id_products_id_fk"
         FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'checkout_intents_customer_id_customers_id_fk'
     ) THEN
       ALTER TABLE "checkout_intents" ADD CONSTRAINT "checkout_intents_customer_id_customers_id_fk"
         FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'checkout_intents_items_parent_id_fk'
     ) THEN
       ALTER TABLE "checkout_intents_items" ADD CONSTRAINT "checkout_intents_items_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."checkout_intents"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'checkout_intents_items_product_ref_id_products_id_fk'
     ) THEN
       ALTER TABLE "checkout_intents_items" ADD CONSTRAINT "checkout_intents_items_product_ref_id_products_id_fk"
         FOREIGN KEY ("product_ref_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'checkout_intents_items_components_parent_id_fk'
     ) THEN
       ALTER TABLE "checkout_intents_items_components" ADD CONSTRAINT "checkout_intents_items_components_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."checkout_intents_items"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'checkout_intents_items_components_product_ref_id_products_id_fk'
     ) THEN
       ALTER TABLE "checkout_intents_items_components" ADD CONSTRAINT "checkout_intents_items_components_product_ref_id_products_id_fk"
         FOREIGN KEY ("product_ref_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'combo_audit_logs_actor_id_users_id_fk'
     ) THEN
       ALTER TABLE "combo_audit_logs" ADD CONSTRAINT "combo_audit_logs_actor_id_users_id_fk"
         FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'combo_audit_logs_combo_id_products_id_fk'
     ) THEN
       ALTER TABLE "combo_audit_logs" ADD CONSTRAINT "combo_audit_logs_combo_id_products_id_fk"
         FOREIGN KEY ("combo_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "checkout_intents_items_components";
   DROP TABLE IF EXISTS "checkout_intents_items";
   DROP TABLE IF EXISTS "checkout_intents";
   DROP TABLE IF EXISTS "combo_audit_logs";
   DROP TABLE IF EXISTS "orders_items_components";
   DROP TABLE IF EXISTS "products_components";

   DROP TYPE IF EXISTS "public"."enum_combo_audit_logs_action";

   -- The products type enum keeps the 'combo' value. PostgreSQL cannot remove a
   -- value from an enum without rewriting the type, and an unused value in a
   -- select is harmless, the way the earlier migrations left theirs.`)
}
