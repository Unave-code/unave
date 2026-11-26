import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * A plan length carries a price for every combination of meals: breakfast and
 * lunch, breakfast and dinner, and all three join the existing prices. Guarded
 * for a database shaped by dev push.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "meal_plans_prices" ADD COLUMN IF NOT EXISTS "breakfast_lunch_price" numeric;
   ALTER TABLE "meal_plans_prices" ADD COLUMN IF NOT EXISTS "breakfast_dinner_price" numeric;
   ALTER TABLE "meal_plans_prices" ADD COLUMN IF NOT EXISTS "all_meals_price" numeric;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "meal_plans_prices" DROP COLUMN IF EXISTS "breakfast_lunch_price";
   ALTER TABLE "meal_plans_prices" DROP COLUMN IF EXISTS "breakfast_dinner_price";
   ALTER TABLE "meal_plans_prices" DROP COLUMN IF EXISTS "all_meals_price";
  `)
}
