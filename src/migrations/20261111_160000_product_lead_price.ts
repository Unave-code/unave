import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Every product carries the price the shelf leads with (2026-11-11).
 *
 * The shelf sorts and filters by price, and a product's lead price is not a
 * column: it is the cheapest per-day rate across a plan's durations, or the
 * flat price of a one-time purchase. Postgres cannot read that out of the
 * durations array, so a `beforeChange` hook writes it onto the row on every
 * save and the query can address it like any other number. This migration adds
 * that column and fills it for the rows already on the shelf, with the same
 * rule the hook uses: the rate floored to whole rupees, a rate that floors to
 * zero dropped, and a one-time purchase keeping its own price.
 *
 * `IF NOT EXISTS` and the `WHERE "from_price" IS NULL` keep this safe on a
 * database managed by dev push, where the column may already be there.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."products" ADD COLUMN IF NOT EXISTS "from_price" numeric;
  `)

  await db.execute(sql`
    UPDATE "public"."products" AS p
    SET "from_price" = CASE
      WHEN p."type" = 'one-time' THEN p."price"
      ELSE (
        SELECT MIN(FLOOR(d."price" / d."days" / 100) * 100)
        FROM "public"."products_durations" AS d
        WHERE d."_parent_id" = p."id"
          AND d."days" > 0
          AND FLOOR(d."price" / d."days" / 100) * 100 > 0
      )
    END
    WHERE p."from_price" IS NULL;
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "products_from_price_idx" ON "public"."products" USING btree ("from_price");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS "public"."products_from_price_idx";`)

  await db.execute(sql`ALTER TABLE "public"."products" DROP COLUMN IF EXISTS "from_price";`)
}
