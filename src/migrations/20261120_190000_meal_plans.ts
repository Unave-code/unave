import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Several meal plans instead of one plan builder.
 *
 * Creates the Meal plans collection (its own menu, prices per plan length, photo,
 * description, audience and lunch/dinner limit), moves the single plan builder's
 * menu and prices into a first plan called Everyday Indian, then drops those
 * columns from the plan builder global, which keeps only what every plan shares:
 * plan lengths, options, delivery times and the list page text.
 *
 * Every step is guarded so a database already shaped by dev push takes it cleanly.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
     CREATE TYPE "public"."enum_meal_plans_meals" AS ENUM('any', 'lunch', 'dinner');
   EXCEPTION
     WHEN duplicate_object THEN null;
   END $$;

   CREATE TABLE IF NOT EXISTS "meal_plans" (
     "id" serial PRIMARY KEY NOT NULL,
     "title" varchar NOT NULL,
     "description" varchar,
     "image_id" integer,
     "audience_id" integer,
     "meals" "enum_meal_plans_meals" DEFAULT 'any' NOT NULL,
     "this_week_range" varchar,
     "this_week_mon_lunch_main" varchar,
     "this_week_mon_dinner_main" varchar,
     "this_week_mon_lunch_sides" varchar,
     "this_week_mon_dinner_sides" varchar,
     "this_week_tue_lunch_main" varchar,
     "this_week_tue_dinner_main" varchar,
     "this_week_tue_lunch_sides" varchar,
     "this_week_tue_dinner_sides" varchar,
     "this_week_wed_lunch_main" varchar,
     "this_week_wed_dinner_main" varchar,
     "this_week_wed_lunch_sides" varchar,
     "this_week_wed_dinner_sides" varchar,
     "this_week_thu_lunch_main" varchar,
     "this_week_thu_dinner_main" varchar,
     "this_week_thu_lunch_sides" varchar,
     "this_week_thu_dinner_sides" varchar,
     "this_week_fri_lunch_main" varchar,
     "this_week_fri_dinner_main" varchar,
     "this_week_fri_lunch_sides" varchar,
     "this_week_fri_dinner_sides" varchar,
     "this_week_sat_lunch_main" varchar,
     "this_week_sat_dinner_main" varchar,
     "this_week_sat_lunch_sides" varchar,
     "this_week_sat_dinner_sides" varchar,
     "next_week_range" varchar,
     "next_week_mon_lunch_main" varchar,
     "next_week_mon_dinner_main" varchar,
     "next_week_mon_lunch_sides" varchar,
     "next_week_mon_dinner_sides" varchar,
     "next_week_tue_lunch_main" varchar,
     "next_week_tue_dinner_main" varchar,
     "next_week_tue_lunch_sides" varchar,
     "next_week_tue_dinner_sides" varchar,
     "next_week_wed_lunch_main" varchar,
     "next_week_wed_dinner_main" varchar,
     "next_week_wed_lunch_sides" varchar,
     "next_week_wed_dinner_sides" varchar,
     "next_week_thu_lunch_main" varchar,
     "next_week_thu_dinner_main" varchar,
     "next_week_thu_lunch_sides" varchar,
     "next_week_thu_dinner_sides" varchar,
     "next_week_fri_lunch_main" varchar,
     "next_week_fri_dinner_main" varchar,
     "next_week_fri_lunch_sides" varchar,
     "next_week_fri_dinner_sides" varchar,
     "next_week_sat_lunch_main" varchar,
     "next_week_sat_dinner_main" varchar,
     "next_week_sat_lunch_sides" varchar,
     "next_week_sat_dinner_sides" varchar,
     "notice_title" varchar DEFAULT 'Cooking around a health need?',
     "notice_body" varchar DEFAULT 'Tell us about allergies, diabetes or a diet your doctor gave you in the order note. We cook to your notes, but our meals are not medical treatment and we can''t promise any result.',
     "slug" varchar NOT NULL,
     "position" numeric DEFAULT 0,
     "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
     "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
   );

   CREATE TABLE IF NOT EXISTS "meal_plans_prices" (
     "_order" integer NOT NULL,
     "_parent_id" integer NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "length" varchar NOT NULL,
     "lunch_price" numeric,
     "dinner_price" numeric,
     "both_price" numeric
   );

   CREATE INDEX IF NOT EXISTS "meal_plans_image_idx" ON "meal_plans" USING btree ("image_id");
   CREATE INDEX IF NOT EXISTS "meal_plans_audience_idx" ON "meal_plans" USING btree ("audience_id");
   CREATE UNIQUE INDEX IF NOT EXISTS "meal_plans_slug_idx" ON "meal_plans" USING btree ("slug");
   CREATE INDEX IF NOT EXISTS "meal_plans_updated_at_idx" ON "meal_plans" USING btree ("updated_at");
   CREATE INDEX IF NOT EXISTS "meal_plans_created_at_idx" ON "meal_plans" USING btree ("created_at");
   CREATE INDEX IF NOT EXISTS "meal_plans_prices_order_idx" ON "meal_plans_prices" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "meal_plans_prices_parent_id_idx" ON "meal_plans_prices" USING btree ("_parent_id");

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_plans_image_id_media_id_fk') THEN
       ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_image_id_media_id_fk"
         FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_plans_audience_id_audiences_id_fk') THEN
       ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_audience_id_audiences_id_fk"
         FOREIGN KEY ("audience_id") REFERENCES "public"."audiences"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_plans_prices_parent_id_fk') THEN
       ALTER TABLE "meal_plans_prices" ADD CONSTRAINT "meal_plans_prices_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "meal_plans_id" integer;
   CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_meal_plans_id_idx" ON "payload_locked_documents_rels" USING btree ("meal_plans_id");

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_meal_plans_fk') THEN
       ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_meal_plans_fk"
         FOREIGN KEY ("meal_plans_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   -- The single plan builder's menu and prices become the first meal plan.
   DO $$
   DECLARE
     plan_id integer;
   BEGIN
     IF EXISTS (SELECT 1 FROM "meal_plans") THEN
       RETURN;
     END IF;

     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'plan_builder' AND column_name = 'this_week_range'
     ) THEN
       EXECUTE 'INSERT INTO "meal_plans" ("title", "slug", "description", "meals", "position", "this_week_range", "this_week_mon_lunch_main", "this_week_mon_dinner_main", "this_week_mon_lunch_sides", "this_week_mon_dinner_sides", "this_week_tue_lunch_main", "this_week_tue_dinner_main", "this_week_tue_lunch_sides", "this_week_tue_dinner_sides", "this_week_wed_lunch_main", "this_week_wed_dinner_main", "this_week_wed_lunch_sides", "this_week_wed_dinner_sides", "this_week_thu_lunch_main", "this_week_thu_dinner_main", "this_week_thu_lunch_sides", "this_week_thu_dinner_sides", "this_week_fri_lunch_main", "this_week_fri_dinner_main", "this_week_fri_lunch_sides", "this_week_fri_dinner_sides", "this_week_sat_lunch_main", "this_week_sat_dinner_main", "this_week_sat_lunch_sides", "this_week_sat_dinner_sides", "next_week_range", "next_week_mon_lunch_main", "next_week_mon_dinner_main", "next_week_mon_lunch_sides", "next_week_mon_dinner_sides", "next_week_tue_lunch_main", "next_week_tue_dinner_main", "next_week_tue_lunch_sides", "next_week_tue_dinner_sides", "next_week_wed_lunch_main", "next_week_wed_dinner_main", "next_week_wed_lunch_sides", "next_week_wed_dinner_sides", "next_week_thu_lunch_main", "next_week_thu_dinner_main", "next_week_thu_lunch_sides", "next_week_thu_dinner_sides", "next_week_fri_lunch_main", "next_week_fri_dinner_main", "next_week_fri_lunch_sides", "next_week_fri_dinner_sides", "next_week_sat_lunch_main", "next_week_sat_dinner_main", "next_week_sat_lunch_sides", "next_week_sat_dinner_sides")
         SELECT ''Everyday Indian'', ''everyday-indian'', ''Balanced home-style Indian meals with a new menu every week.'', ''any'', 1, "this_week_range", "this_week_mon_lunch_main", "this_week_mon_dinner_main", "this_week_mon_lunch_sides", "this_week_mon_dinner_sides", "this_week_tue_lunch_main", "this_week_tue_dinner_main", "this_week_tue_lunch_sides", "this_week_tue_dinner_sides", "this_week_wed_lunch_main", "this_week_wed_dinner_main", "this_week_wed_lunch_sides", "this_week_wed_dinner_sides", "this_week_thu_lunch_main", "this_week_thu_dinner_main", "this_week_thu_lunch_sides", "this_week_thu_dinner_sides", "this_week_fri_lunch_main", "this_week_fri_dinner_main", "this_week_fri_lunch_sides", "this_week_fri_dinner_sides", "this_week_sat_lunch_main", "this_week_sat_dinner_main", "this_week_sat_lunch_sides", "this_week_sat_dinner_sides", "next_week_range", "next_week_mon_lunch_main", "next_week_mon_dinner_main", "next_week_mon_lunch_sides", "next_week_mon_dinner_sides", "next_week_tue_lunch_main", "next_week_tue_dinner_main", "next_week_tue_lunch_sides", "next_week_tue_dinner_sides", "next_week_wed_lunch_main", "next_week_wed_dinner_main", "next_week_wed_lunch_sides", "next_week_wed_dinner_sides", "next_week_thu_lunch_main", "next_week_thu_dinner_main", "next_week_thu_lunch_sides", "next_week_thu_dinner_sides", "next_week_fri_lunch_main", "next_week_fri_dinner_main", "next_week_fri_lunch_sides", "next_week_fri_dinner_sides", "next_week_sat_lunch_main", "next_week_sat_dinner_main", "next_week_sat_lunch_sides", "next_week_sat_dinner_sides"
         FROM "plan_builder" ORDER BY "id" LIMIT 1
         RETURNING "id"' INTO plan_id;
     END IF;

     IF plan_id IS NULL THEN
       RETURN;
     END IF;

     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'plan_builder_plans' AND column_name = 'both_price'
     ) THEN
       EXECUTE 'INSERT INTO "meal_plans_prices" ("_order", "_parent_id", "id", "length", "lunch_price", "dinner_price", "both_price")
         SELECT "_order", $1, substr(md5(random()::text || clock_timestamp()::text || "id"), 1, 24), "label", "lunch_price", "dinner_price", "both_price"
         FROM "plan_builder_plans"' USING plan_id;
     END IF;
   END $$;

   -- Menus, prices and the notice now live on each meal plan.
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_range";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_range";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_mon_lunch_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_mon_lunch_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_mon_dinner_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_mon_dinner_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_mon_lunch_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_mon_lunch_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_mon_dinner_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_mon_dinner_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_tue_lunch_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_tue_lunch_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_tue_dinner_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_tue_dinner_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_tue_lunch_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_tue_lunch_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_tue_dinner_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_tue_dinner_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_wed_lunch_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_wed_lunch_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_wed_dinner_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_wed_dinner_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_wed_lunch_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_wed_lunch_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_wed_dinner_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_wed_dinner_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_thu_lunch_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_thu_lunch_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_thu_dinner_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_thu_dinner_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_thu_lunch_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_thu_lunch_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_thu_dinner_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_thu_dinner_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_fri_lunch_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_fri_lunch_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_fri_dinner_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_fri_dinner_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_fri_lunch_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_fri_lunch_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_fri_dinner_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_fri_dinner_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_sat_lunch_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_sat_lunch_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_sat_dinner_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_sat_dinner_main";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_sat_lunch_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_sat_lunch_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "this_week_sat_dinner_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "next_week_sat_dinner_sides";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "notice_title";
   ALTER TABLE "plan_builder" DROP COLUMN IF EXISTS "notice_body";
   ALTER TABLE "plan_builder_plans" DROP COLUMN IF EXISTS "lunch_price";
   ALTER TABLE "plan_builder_plans" DROP COLUMN IF EXISTS "dinner_price";
   ALTER TABLE "plan_builder_plans" DROP COLUMN IF EXISTS "both_price";

   -- The list page's words, for a page that now lists meal plans.
   ALTER TABLE "plan_builder" ALTER COLUMN "eyebrow" SET DEFAULT 'Meal subscription';
   ALTER TABLE "plan_builder" ALTER COLUMN "intro" SET DEFAULT 'Choose a meal plan, see what we are cooking, pick your options, then pay securely.';
   UPDATE "plan_builder" SET "eyebrow" = 'Meal subscription' WHERE "eyebrow" = 'Plan builder';
   UPDATE "plan_builder" SET "intro" = 'Choose a meal plan, see what we are cooking, pick your options, then pay securely.'
     WHERE "intro" = 'Pick your plan, see what we are cooking, choose your options, then pay securely.';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "plan_builder_plans" ADD COLUMN IF NOT EXISTS "lunch_price" numeric;
   ALTER TABLE "plan_builder_plans" ADD COLUMN IF NOT EXISTS "dinner_price" numeric;
   ALTER TABLE "plan_builder_plans" ADD COLUMN IF NOT EXISTS "both_price" numeric;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_range" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_mon_lunch_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_mon_dinner_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_mon_lunch_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_mon_dinner_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_tue_lunch_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_tue_dinner_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_tue_lunch_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_tue_dinner_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_wed_lunch_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_wed_dinner_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_wed_lunch_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_wed_dinner_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_thu_lunch_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_thu_dinner_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_thu_lunch_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_thu_dinner_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_fri_lunch_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_fri_dinner_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_fri_lunch_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_fri_dinner_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_sat_lunch_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_sat_dinner_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_sat_lunch_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "this_week_sat_dinner_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_range" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_mon_lunch_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_mon_dinner_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_mon_lunch_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_mon_dinner_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_tue_lunch_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_tue_dinner_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_tue_lunch_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_tue_dinner_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_wed_lunch_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_wed_dinner_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_wed_lunch_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_wed_dinner_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_thu_lunch_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_thu_dinner_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_thu_lunch_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_thu_dinner_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_fri_lunch_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_fri_dinner_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_fri_lunch_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_fri_dinner_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_sat_lunch_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_sat_dinner_main" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_sat_lunch_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "next_week_sat_dinner_sides" varchar;
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "notice_title" varchar DEFAULT 'Cooking around a health need?';
   ALTER TABLE "plan_builder" ADD COLUMN IF NOT EXISTS "notice_body" varchar DEFAULT 'Tell us about allergies, diabetes or a diet your doctor gave you in the order note. We cook to your notes, but our meals are not medical treatment and we can''t promise any result.';

   -- Carry the first meal plan back into the single plan builder.
   UPDATE "plan_builder" pb SET "this_week_range" = mp."this_week_range", "this_week_mon_lunch_main" = mp."this_week_mon_lunch_main", "this_week_mon_dinner_main" = mp."this_week_mon_dinner_main", "this_week_mon_lunch_sides" = mp."this_week_mon_lunch_sides", "this_week_mon_dinner_sides" = mp."this_week_mon_dinner_sides", "this_week_tue_lunch_main" = mp."this_week_tue_lunch_main", "this_week_tue_dinner_main" = mp."this_week_tue_dinner_main", "this_week_tue_lunch_sides" = mp."this_week_tue_lunch_sides", "this_week_tue_dinner_sides" = mp."this_week_tue_dinner_sides", "this_week_wed_lunch_main" = mp."this_week_wed_lunch_main", "this_week_wed_dinner_main" = mp."this_week_wed_dinner_main", "this_week_wed_lunch_sides" = mp."this_week_wed_lunch_sides", "this_week_wed_dinner_sides" = mp."this_week_wed_dinner_sides", "this_week_thu_lunch_main" = mp."this_week_thu_lunch_main", "this_week_thu_dinner_main" = mp."this_week_thu_dinner_main", "this_week_thu_lunch_sides" = mp."this_week_thu_lunch_sides", "this_week_thu_dinner_sides" = mp."this_week_thu_dinner_sides", "this_week_fri_lunch_main" = mp."this_week_fri_lunch_main", "this_week_fri_dinner_main" = mp."this_week_fri_dinner_main", "this_week_fri_lunch_sides" = mp."this_week_fri_lunch_sides", "this_week_fri_dinner_sides" = mp."this_week_fri_dinner_sides", "this_week_sat_lunch_main" = mp."this_week_sat_lunch_main", "this_week_sat_dinner_main" = mp."this_week_sat_dinner_main", "this_week_sat_lunch_sides" = mp."this_week_sat_lunch_sides", "this_week_sat_dinner_sides" = mp."this_week_sat_dinner_sides", "next_week_range" = mp."next_week_range", "next_week_mon_lunch_main" = mp."next_week_mon_lunch_main", "next_week_mon_dinner_main" = mp."next_week_mon_dinner_main", "next_week_mon_lunch_sides" = mp."next_week_mon_lunch_sides", "next_week_mon_dinner_sides" = mp."next_week_mon_dinner_sides", "next_week_tue_lunch_main" = mp."next_week_tue_lunch_main", "next_week_tue_dinner_main" = mp."next_week_tue_dinner_main", "next_week_tue_lunch_sides" = mp."next_week_tue_lunch_sides", "next_week_tue_dinner_sides" = mp."next_week_tue_dinner_sides", "next_week_wed_lunch_main" = mp."next_week_wed_lunch_main", "next_week_wed_dinner_main" = mp."next_week_wed_dinner_main", "next_week_wed_lunch_sides" = mp."next_week_wed_lunch_sides", "next_week_wed_dinner_sides" = mp."next_week_wed_dinner_sides", "next_week_thu_lunch_main" = mp."next_week_thu_lunch_main", "next_week_thu_dinner_main" = mp."next_week_thu_dinner_main", "next_week_thu_lunch_sides" = mp."next_week_thu_lunch_sides", "next_week_thu_dinner_sides" = mp."next_week_thu_dinner_sides", "next_week_fri_lunch_main" = mp."next_week_fri_lunch_main", "next_week_fri_dinner_main" = mp."next_week_fri_dinner_main", "next_week_fri_lunch_sides" = mp."next_week_fri_lunch_sides", "next_week_fri_dinner_sides" = mp."next_week_fri_dinner_sides", "next_week_sat_lunch_main" = mp."next_week_sat_lunch_main", "next_week_sat_dinner_main" = mp."next_week_sat_dinner_main", "next_week_sat_lunch_sides" = mp."next_week_sat_lunch_sides", "next_week_sat_dinner_sides" = mp."next_week_sat_dinner_sides"
     FROM (SELECT * FROM "meal_plans" ORDER BY "position", "id" LIMIT 1) mp;
   UPDATE "plan_builder_plans" pp SET "lunch_price" = p."lunch_price", "dinner_price" = p."dinner_price", "both_price" = p."both_price"
     FROM "meal_plans_prices" p
     WHERE p."_parent_id" = (SELECT "id" FROM "meal_plans" ORDER BY "position", "id" LIMIT 1) AND lower(p."length") = lower(pp."label");
   UPDATE "plan_builder_plans" SET "lunch_price" = COALESCE("lunch_price", 1), "dinner_price" = COALESCE("dinner_price", 1), "both_price" = COALESCE("both_price", 1);
   ALTER TABLE "plan_builder_plans" ALTER COLUMN "lunch_price" SET NOT NULL;
   ALTER TABLE "plan_builder_plans" ALTER COLUMN "dinner_price" SET NOT NULL;
   ALTER TABLE "plan_builder_plans" ALTER COLUMN "both_price" SET NOT NULL;

   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_meal_plans_fk";
   DROP INDEX IF EXISTS "payload_locked_documents_rels_meal_plans_id_idx";
   ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "meal_plans_id";
   DROP TABLE IF EXISTS "meal_plans_prices";
   DROP TABLE IF EXISTS "meal_plans";
   DROP TYPE IF EXISTS "public"."enum_meal_plans_meals";
  `)
}
