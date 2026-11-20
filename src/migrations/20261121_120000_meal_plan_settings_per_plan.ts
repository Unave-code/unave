import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Meal plan settings fold into each meal plan.
 *
 * Every meal plan now carries its own plan lengths (name, delivery days, tag and
 * prices), its own pick-one options and its own delivery times. The values the
 * shared Meal plan settings global held are copied onto every existing plan, then
 * the global's tables are dropped. The list page's words become fixed copy, and
 * the per-plan "Cooking around a health need?" notice is removed.
 *
 * Every step is guarded so a database already shaped by dev push takes it cleanly.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "lunch_time" varchar DEFAULT '12:00 – 1:30 PM';
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "dinner_time" varchar DEFAULT '7:00 – 8:30 PM';
   ALTER TABLE "meal_plans_prices" ADD COLUMN IF NOT EXISTS "days" numeric;
   ALTER TABLE "meal_plans_prices" ADD COLUMN IF NOT EXISTS "note" varchar;

   CREATE TABLE IF NOT EXISTS "meal_plans_option_groups" (
     "_order" integer NOT NULL,
     "_parent_id" integer NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "title" varchar NOT NULL,
     "hint" varchar
   );

   CREATE TABLE IF NOT EXISTS "meal_plans_option_groups_choices" (
     "_order" integer NOT NULL,
     "_parent_id" varchar NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "label" varchar NOT NULL,
     "detail" varchar,
     "extra_per_day" numeric DEFAULT 0
   );

   CREATE INDEX IF NOT EXISTS "meal_plans_option_groups_order_idx" ON "meal_plans_option_groups" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "meal_plans_option_groups_parent_id_idx" ON "meal_plans_option_groups" USING btree ("_parent_id");
   CREATE INDEX IF NOT EXISTS "meal_plans_option_groups_choices_order_idx" ON "meal_plans_option_groups_choices" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "meal_plans_option_groups_choices_parent_id_idx" ON "meal_plans_option_groups_choices" USING btree ("_parent_id");

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_plans_option_groups_parent_id_fk') THEN
       ALTER TABLE "meal_plans_option_groups" ADD CONSTRAINT "meal_plans_option_groups_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_plans_option_groups_choices_parent_id_fk') THEN
       ALTER TABLE "meal_plans_option_groups_choices" ADD CONSTRAINT "meal_plans_option_groups_choices_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."meal_plans_option_groups"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   -- Copy what the shared settings held onto every meal plan.
   DO $$ BEGIN
     IF to_regclass('public.plan_builder') IS NOT NULL THEN
       EXECUTE 'UPDATE "meal_plans" mp SET "lunch_time" = pb."lunch_time", "dinner_time" = pb."dinner_time"
         FROM (SELECT * FROM "plan_builder" ORDER BY "id" LIMIT 1) pb';
     END IF;

     IF to_regclass('public.plan_builder_plans') IS NOT NULL THEN
       EXECUTE 'UPDATE "meal_plans_prices" p SET "days" = pp."days", "note" = pp."note"
         FROM "plan_builder_plans" pp
         WHERE lower(trim(pp."label")) = lower(trim(p."length")) AND p."days" IS NULL';
     END IF;

     IF to_regclass('public.plan_builder_option_groups') IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "meal_plans_option_groups") THEN
       EXECUTE 'INSERT INTO "meal_plans_option_groups" ("_order", "_parent_id", "id", "title", "hint")
         SELECT g."_order", mp."id", substr(md5(g."id" || ''/'' || mp."id"), 1, 24), g."title", g."hint"
         FROM "plan_builder_option_groups" g CROSS JOIN "meal_plans" mp';
       EXECUTE 'INSERT INTO "meal_plans_option_groups_choices" ("_order", "_parent_id", "id", "label", "detail", "extra_per_day")
         SELECT c."_order", substr(md5(c."_parent_id" || ''/'' || mp."id"), 1, 24), substr(md5(c."id" || ''/'' || mp."id"), 1, 24), c."label", c."detail", c."extra_per_day"
         FROM "plan_builder_option_groups_choices" c CROSS JOIN "meal_plans" mp';
     END IF;
   END $$;

   -- A price row that named no shared length guesses its days from the name, else one week.
   UPDATE "meal_plans_prices" SET "days" = CASE
       WHEN "length" ~* '^\\s*\\d+\\s*week' THEN 6 * substring("length" from '\\d+')::numeric
       ELSE 6
     END
     WHERE "days" IS NULL;
   ALTER TABLE "meal_plans_prices" ALTER COLUMN "days" SET NOT NULL;

   DROP TABLE IF EXISTS "plan_builder_option_groups_choices";
   DROP TABLE IF EXISTS "plan_builder_option_groups";
   DROP TABLE IF EXISTS "plan_builder_plans";
   DROP TABLE IF EXISTS "plan_builder";

   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "notice_title";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "notice_body";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "plan_builder" (
     "id" serial PRIMARY KEY NOT NULL,
     "lunch_time" varchar DEFAULT '12:00 – 1:30 PM',
     "dinner_time" varchar DEFAULT '7:00 – 8:30 PM',
     "eyebrow" varchar DEFAULT 'Meal subscription',
     "heading" varchar DEFAULT 'A fresh home-style menu every week',
     "intro" varchar DEFAULT 'Choose a meal plan, see what we are cooking, pick your options, then pay securely.',
     "updated_at" timestamp(3) with time zone,
     "created_at" timestamp(3) with time zone
   );
   CREATE TABLE IF NOT EXISTS "plan_builder_plans" (
     "_order" integer NOT NULL,
     "_parent_id" integer NOT NULL REFERENCES "public"."plan_builder"("id") ON DELETE cascade,
     "id" varchar PRIMARY KEY NOT NULL,
     "label" varchar NOT NULL,
     "days" numeric NOT NULL,
     "note" varchar
   );
   CREATE TABLE IF NOT EXISTS "plan_builder_option_groups" (
     "_order" integer NOT NULL,
     "_parent_id" integer NOT NULL REFERENCES "public"."plan_builder"("id") ON DELETE cascade,
     "id" varchar PRIMARY KEY NOT NULL,
     "title" varchar NOT NULL,
     "hint" varchar
   );
   CREATE TABLE IF NOT EXISTS "plan_builder_option_groups_choices" (
     "_order" integer NOT NULL,
     "_parent_id" varchar NOT NULL REFERENCES "public"."plan_builder_option_groups"("id") ON DELETE cascade,
     "id" varchar PRIMARY KEY NOT NULL,
     "label" varchar NOT NULL,
     "detail" varchar,
     "extra_per_day" numeric DEFAULT 0
   );
   CREATE INDEX IF NOT EXISTS "plan_builder_plans_order_idx" ON "plan_builder_plans" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "plan_builder_plans_parent_id_idx" ON "plan_builder_plans" USING btree ("_parent_id");
   CREATE INDEX IF NOT EXISTS "plan_builder_option_groups_order_idx" ON "plan_builder_option_groups" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "plan_builder_option_groups_parent_id_idx" ON "plan_builder_option_groups" USING btree ("_parent_id");
   CREATE INDEX IF NOT EXISTS "plan_builder_option_groups_choices_order_idx" ON "plan_builder_option_groups_choices" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "plan_builder_option_groups_choices_parent_id_idx" ON "plan_builder_option_groups_choices" USING btree ("_parent_id");

   -- The first meal plan's lengths, options and times become the shared settings again.
   DO $$
   DECLARE
     parent integer;
     first_plan integer;
   BEGIN
     IF EXISTS (SELECT 1 FROM "plan_builder") THEN
       RETURN;
     END IF;
     SELECT "id" INTO first_plan FROM "meal_plans" ORDER BY "position", "id" LIMIT 1;
     INSERT INTO "plan_builder" ("lunch_time", "dinner_time", "updated_at", "created_at")
       SELECT COALESCE((SELECT "lunch_time" FROM "meal_plans" WHERE "id" = first_plan), '12:00 – 1:30 PM'),
              COALESCE((SELECT "dinner_time" FROM "meal_plans" WHERE "id" = first_plan), '7:00 – 8:30 PM'),
              now(), now()
       RETURNING "id" INTO parent;
     IF first_plan IS NULL THEN
       RETURN;
     END IF;
     INSERT INTO "plan_builder_plans" ("_order", "_parent_id", "id", "label", "days", "note")
       SELECT "_order", parent, "id", "length", "days", "note" FROM "meal_plans_prices" WHERE "_parent_id" = first_plan;
     INSERT INTO "plan_builder_option_groups" ("_order", "_parent_id", "id", "title", "hint")
       SELECT "_order", parent, "id", "title", "hint" FROM "meal_plans_option_groups" WHERE "_parent_id" = first_plan;
     INSERT INTO "plan_builder_option_groups_choices" ("_order", "_parent_id", "id", "label", "detail", "extra_per_day")
       SELECT c."_order", c."_parent_id", c."id", c."label", c."detail", c."extra_per_day"
       FROM "meal_plans_option_groups_choices" c
       JOIN "meal_plans_option_groups" g ON g."id" = c."_parent_id"
       WHERE g."_parent_id" = first_plan;
   END $$;

   DROP TABLE IF EXISTS "meal_plans_option_groups_choices";
   DROP TABLE IF EXISTS "meal_plans_option_groups";
   ALTER TABLE "meal_plans_prices" DROP COLUMN IF EXISTS "days";
   ALTER TABLE "meal_plans_prices" DROP COLUMN IF EXISTS "note";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "lunch_time";
   ALTER TABLE "meal_plans" DROP COLUMN IF EXISTS "dinner_time";
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "notice_title" varchar DEFAULT 'Cooking around a health need?';
   ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "notice_body" varchar DEFAULT 'Tell us about allergies, diabetes or a diet your doctor gave you in the order note. We cook to your notes, but our meals are not medical treatment and we can''t promise any result.';
  `)
}
