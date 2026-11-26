import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Meal plans serve breakfast: a breakfast price per plan length (added on top of
 * the lunch and dinner choice), a breakfast delivery time, a breakfast column in
 * the weekly menu, and meals offered values for breakfast only and for each pair
 * of meals (breakfast and lunch, breakfast and dinner, lunch and dinner). Guarded for a
 * database shaped by dev push.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_meal_plans_meals" ADD VALUE IF NOT EXISTS 'breakfast-lunch';
   ALTER TYPE "public"."enum_meal_plans_meals" ADD VALUE IF NOT EXISTS 'breakfast-dinner';
   ALTER TYPE "public"."enum_meal_plans_meals" ADD VALUE IF NOT EXISTS 'lunch-dinner';
   ALTER TYPE "public"."enum_meal_plans_meals" ADD VALUE IF NOT EXISTS 'breakfast';
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "breakfast_time" varchar DEFAULT '7:00 – 8:30 AM';
   ALTER TABLE "meal_plans_prices" ADD COLUMN IF NOT EXISTS "breakfast_price" numeric;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "this_week_mon_breakfast_main" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "this_week_mon_breakfast_sides" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "this_week_tue_breakfast_main" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "this_week_tue_breakfast_sides" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "this_week_wed_breakfast_main" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "this_week_wed_breakfast_sides" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "this_week_thu_breakfast_main" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "this_week_thu_breakfast_sides" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "this_week_fri_breakfast_main" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "this_week_fri_breakfast_sides" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "this_week_sat_breakfast_main" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "this_week_sat_breakfast_sides" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "this_week_mon_breakfast_main";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "this_week_mon_breakfast_sides";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "this_week_tue_breakfast_main";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "this_week_tue_breakfast_sides";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "this_week_wed_breakfast_main";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "this_week_wed_breakfast_sides";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "this_week_thu_breakfast_main";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "this_week_thu_breakfast_sides";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "this_week_fri_breakfast_main";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "this_week_fri_breakfast_sides";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "this_week_sat_breakfast_main";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "this_week_sat_breakfast_sides";
   ALTER TABLE "meal_plans_prices" DROP COLUMN IF EXISTS "breakfast_price";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "breakfast_time";
   UPDATE "meal_plans" SET "meals" = 'any' WHERE "meals"::text IN ('breakfast', 'breakfast-lunch', 'breakfast-dinner', 'lunch-dinner');
   ALTER TABLE "meal_plans" ALTER COLUMN "meals" DROP DEFAULT;
   ALTER TYPE "public"."enum_meal_plans_meals" RENAME TO "enum_meal_plans_meals_old";
   CREATE TYPE "public"."enum_meal_plans_meals" AS ENUM('any', 'lunch', 'dinner');
   ALTER TABLE "meal_plans" ALTER COLUMN "meals" TYPE "public"."enum_meal_plans_meals" USING "meals"::text::"public"."enum_meal_plans_meals";
   ALTER TABLE "meal_plans" ALTER COLUMN "meals" SET DEFAULT 'any';
   DROP TYPE "public"."enum_meal_plans_meals_old";
  `)
}
