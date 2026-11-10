import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Products can be one-time purchases and order lines carry a quantity (2026-11-11).
 *
 * A product used to be a meal plan and nothing else, so every product needed at
 * least one duration to have a price at all. Now `type` splits the catalogue: a
 * `plan` keeps its durations, and a `one-time` purchase carries a single `price`
 * on the product itself and no durations. Existing products default to `plan`,
 * which is what they already are, so nothing on the shelf changes.
 *
 * `orders_items.qty` records how many of a line were bought. Plan lines are
 * always one; a one-time line can hold up to ten. Old rows default to one.
 *
 * `IF NOT EXISTS`, the defaults and the destructure-before-not-null keep this
 * safe on a database managed by dev push, where the columns may already be there.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_products_type" AS ENUM('plan', 'one-time');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    ALTER TABLE "public"."products" ADD COLUMN IF NOT EXISTS "type" "public"."enum_products_type" DEFAULT 'plan';
    ALTER TABLE "public"."products" ADD COLUMN IF NOT EXISTS "price" numeric;

    UPDATE "public"."products" SET "type" = 'plan' WHERE "type" IS NULL;
    ALTER TABLE "public"."products" ALTER COLUMN "type" SET NOT NULL;

    ALTER TABLE "public"."orders_items" ADD COLUMN IF NOT EXISTS "qty" numeric DEFAULT 1;
    UPDATE "public"."orders_items" SET "qty" = 1 WHERE "qty" IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."orders_items" DROP COLUMN IF EXISTS "qty";
    ALTER TABLE "public"."products" ALTER COLUMN "type" DROP NOT NULL;
    ALTER TABLE "public"."products" DROP COLUMN IF EXISTS "type";
    ALTER TABLE "public"."products" DROP COLUMN IF EXISTS "price";
    DROP TYPE IF EXISTS "public"."enum_products_type";
  `)
}
