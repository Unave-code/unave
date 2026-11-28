import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Cash on delivery (spec 2026-11-28). Orders gain how they are paid and where
 * the payment stands; every existing row is an online, paid order, which the
 * NOT NULL defaults fill in. Adds the payment settings global. Every step is
 * guarded so a database already shaped by dev push takes the migration cleanly.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_orders_payment_type') THEN
       CREATE TYPE "public"."enum_orders_payment_type" AS ENUM('online', 'cash');
     END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_orders_payment_state') THEN
       CREATE TYPE "public"."enum_orders_payment_state" AS ENUM('paid', 'cashDue', 'collected', 'cancelled');
     END IF;
   END $$;

   ALTER TABLE "orders"
     ADD COLUMN IF NOT EXISTS "payment_type" "public"."enum_orders_payment_type" DEFAULT 'online' NOT NULL,
     ADD COLUMN IF NOT EXISTS "payment_state" "public"."enum_orders_payment_state" DEFAULT 'paid' NOT NULL,
     ADD COLUMN IF NOT EXISTS "collected_by_id" integer,
     ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp(3) with time zone,
     ADD COLUMN IF NOT EXISTS "cash_key" varchar;

   CREATE INDEX IF NOT EXISTS "orders_payment_type_idx" ON "orders" USING btree ("payment_type");
   CREATE INDEX IF NOT EXISTS "orders_payment_state_idx" ON "orders" USING btree ("payment_state");
   CREATE INDEX IF NOT EXISTS "orders_collected_by_idx" ON "orders" USING btree ("collected_by_id");
   CREATE UNIQUE INDEX IF NOT EXISTS "orders_cash_key_idx" ON "orders" USING btree ("cash_key");

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_collected_by_id_users_id_fk') THEN
       ALTER TABLE "orders" ADD CONSTRAINT "orders_collected_by_id_users_id_fk"
         FOREIGN KEY ("collected_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   CREATE TABLE IF NOT EXISTS "payment_settings" (
     "id" serial PRIMARY KEY NOT NULL,
     "cod_enabled" boolean DEFAULT true,
     "cod_max_total" numeric,
     "updated_at" timestamp(3) with time zone,
     "created_at" timestamp(3) with time zone
   );`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "payment_settings";

   ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_collected_by_id_users_id_fk";
   DROP INDEX IF EXISTS "orders_cash_key_idx";
   DROP INDEX IF EXISTS "orders_collected_by_idx";
   DROP INDEX IF EXISTS "orders_payment_state_idx";
   DROP INDEX IF EXISTS "orders_payment_type_idx";

   ALTER TABLE "orders"
     DROP COLUMN IF EXISTS "cash_key",
     DROP COLUMN IF EXISTS "cancelled_at",
     DROP COLUMN IF EXISTS "collected_by_id",
     DROP COLUMN IF EXISTS "payment_state",
     DROP COLUMN IF EXISTS "payment_type";

   DROP TYPE IF EXISTS "public"."enum_orders_payment_state";
   DROP TYPE IF EXISTS "public"."enum_orders_payment_type";`)
}
