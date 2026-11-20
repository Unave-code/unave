import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Meal plans show one weekly menu. The Next week menu and its switch are gone,
 * so its columns are dropped. Staff update the one menu each week.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_range";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_mon_lunch_main";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_mon_dinner_main";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_mon_lunch_sides";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_mon_dinner_sides";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_tue_lunch_main";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_tue_dinner_main";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_tue_lunch_sides";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_tue_dinner_sides";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_wed_lunch_main";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_wed_dinner_main";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_wed_lunch_sides";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_wed_dinner_sides";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_thu_lunch_main";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_thu_dinner_main";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_thu_lunch_sides";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_thu_dinner_sides";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_fri_lunch_main";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_fri_dinner_main";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_fri_lunch_sides";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_fri_dinner_sides";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_sat_lunch_main";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_sat_dinner_main";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_sat_lunch_sides";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "next_week_sat_dinner_sides";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_range" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_mon_lunch_main" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_mon_dinner_main" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_mon_lunch_sides" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_mon_dinner_sides" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_tue_lunch_main" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_tue_dinner_main" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_tue_lunch_sides" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_tue_dinner_sides" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_wed_lunch_main" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_wed_dinner_main" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_wed_lunch_sides" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_wed_dinner_sides" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_thu_lunch_main" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_thu_dinner_main" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_thu_lunch_sides" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_thu_dinner_sides" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_fri_lunch_main" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_fri_dinner_main" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_fri_lunch_sides" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_fri_dinner_sides" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_sat_lunch_main" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_sat_dinner_main" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_sat_lunch_sides" varchar;
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "next_week_sat_dinner_sides" varchar;
  `)
}
