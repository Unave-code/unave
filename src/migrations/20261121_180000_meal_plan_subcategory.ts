import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Meal plans gain a category and a subcategory, like products, so the meal plans
 * page can offer subcategory tiles. Both are optional: existing plans keep
 * working and take the default category. Guarded for a database shaped by dev push.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
     CREATE TYPE "public"."enum_meal_plans_category" AS ENUM('ready-to-cook', 'ready-to-eat', 'fresh-from-produce');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;

   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "category" "public"."enum_meal_plans_category" DEFAULT 'ready-to-eat';
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "subcategory_id" integer;
   CREATE INDEX IF NOT EXISTS "meal_plans_subcategory_idx" ON "meal_plans" USING btree ("subcategory_id");

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_plans_subcategory_id_subcategories_id_fk') THEN
       ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_subcategory_id_subcategories_id_fk"
         FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "meal_plans" DROP CONSTRAINT IF EXISTS "meal_plans_subcategory_id_subcategories_id_fk";
   DROP INDEX IF EXISTS "meal_plans_subcategory_idx";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "subcategory_id";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "category";
   DROP TYPE IF EXISTS "public"."enum_meal_plans_category";
  `)
}
