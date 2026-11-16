import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * A meal plan now leads with its cheapest duration's total instead of a rate a
 * day, so its stored `from_price` (what the shelf sorts and filters by) is
 * recomputed for every plan. New saves keep it in step through `setLeadPrice`.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   UPDATE "products" AS p
      SET "from_price" = d.min_price
     FROM (
       SELECT "_parent_id", MIN("price") AS min_price
         FROM "products_durations"
        WHERE "price" >= 1
        GROUP BY "_parent_id"
     ) AS d
    WHERE d."_parent_id" = p."id"
      AND p."type" = 'plan';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Back to the cheapest rate a day, floored to whole rupees.
  await db.execute(sql`
   UPDATE "products" AS p
      SET "from_price" = d.min_rate
     FROM (
       SELECT "_parent_id", MIN(FLOOR("price" / "days" / 100) * 100) AS min_rate
         FROM "products_durations"
        WHERE "days" > 0
        GROUP BY "_parent_id"
     ) AS d
    WHERE d."_parent_id" = p."id"
      AND p."type" = 'plan';
  `)
}
