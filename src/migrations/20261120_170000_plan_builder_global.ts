import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * The Plan builder global (Catalogue → Plan builder): the weekly menu as fixed
 * day by day columns, the plan lengths with one price per meal choice, and the
 * pick-one options with their nested choices. Seeds the starting menu, prices
 * and the Normal / Detox juice choice once, so /meal-subscription is never empty.
 *
 * Also lets a checkout intent line carry no product id: a built plan is priced
 * from this global, not from a product record.
 *
 * Every step is guarded so a database already shaped by dev push takes it cleanly.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "plan_builder" (
     "id" serial PRIMARY KEY NOT NULL,
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
     "lunch_time" varchar DEFAULT '12:00 – 1:30 PM',
     "dinner_time" varchar DEFAULT '7:00 – 8:30 PM',
     "eyebrow" varchar DEFAULT 'Plan builder',
     "heading" varchar DEFAULT 'A fresh home-style menu every week',
     "intro" varchar DEFAULT 'Pick your plan, see what we are cooking, choose your options, then pay securely.',
     "notice_title" varchar DEFAULT 'Cooking around a health need?',
     "notice_body" varchar DEFAULT 'Tell us about allergies, diabetes or a diet your doctor gave you in the order note. We cook to your notes, but our meals are not medical treatment and we can''t promise any result.',
     "updated_at" timestamp(3) with time zone,
     "created_at" timestamp(3) with time zone
   );

   CREATE TABLE IF NOT EXISTS "plan_builder_plans" (
     "_order" integer NOT NULL,
     "_parent_id" integer NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "label" varchar NOT NULL,
     "days" numeric NOT NULL,
     "note" varchar,
     "lunch_price" numeric NOT NULL,
     "dinner_price" numeric NOT NULL,
     "both_price" numeric NOT NULL
   );

   CREATE TABLE IF NOT EXISTS "plan_builder_option_groups" (
     "_order" integer NOT NULL,
     "_parent_id" integer NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "title" varchar NOT NULL,
     "hint" varchar
   );

   CREATE TABLE IF NOT EXISTS "plan_builder_option_groups_choices" (
     "_order" integer NOT NULL,
     "_parent_id" varchar NOT NULL,
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

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_builder_plans_parent_id_fk') THEN
       ALTER TABLE "plan_builder_plans" ADD CONSTRAINT "plan_builder_plans_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."plan_builder"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_builder_option_groups_parent_id_fk') THEN
       ALTER TABLE "plan_builder_option_groups" ADD CONSTRAINT "plan_builder_option_groups_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."plan_builder"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_builder_option_groups_choices_parent_id_fk') THEN
       ALTER TABLE "plan_builder_option_groups_choices" ADD CONSTRAINT "plan_builder_option_groups_choices_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."plan_builder_option_groups"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   -- A plan built on the plan builder has no product record behind it.
   ALTER TABLE "checkout_intents_items" ALTER COLUMN "product_id" DROP NOT NULL;

   -- Seed the starting menu, prices and juice option once, so the page is never empty.
   DO $$
   DECLARE
     parent integer;
     juice varchar := substr(md5(random()::text || clock_timestamp()::text), 1, 24);
   BEGIN
     IF EXISTS (SELECT 1 FROM "plan_builder") THEN
       RETURN;
     END IF;

     INSERT INTO "plan_builder" ("this_week_range", "this_week_mon_lunch_main", "this_week_mon_lunch_sides", "this_week_mon_dinner_main", "this_week_mon_dinner_sides", "this_week_tue_lunch_main", "this_week_tue_lunch_sides", "this_week_tue_dinner_main", "this_week_tue_dinner_sides", "this_week_wed_lunch_main", "this_week_wed_lunch_sides", "this_week_wed_dinner_main", "this_week_wed_dinner_sides", "this_week_thu_lunch_main", "this_week_thu_lunch_sides", "this_week_thu_dinner_main", "this_week_thu_dinner_sides", "this_week_fri_lunch_main", "this_week_fri_lunch_sides", "this_week_fri_dinner_main", "this_week_fri_dinner_sides", "this_week_sat_lunch_main", "this_week_sat_lunch_sides", "this_week_sat_dinner_main", "this_week_sat_dinner_sides", "next_week_range", "next_week_mon_lunch_main", "next_week_mon_lunch_sides", "next_week_mon_dinner_main", "next_week_mon_dinner_sides", "next_week_tue_lunch_main", "next_week_tue_lunch_sides", "next_week_tue_dinner_main", "next_week_tue_dinner_sides", "next_week_wed_lunch_main", "next_week_wed_lunch_sides", "next_week_wed_dinner_main", "next_week_wed_dinner_sides", "next_week_thu_lunch_main", "next_week_thu_lunch_sides", "next_week_thu_dinner_main", "next_week_thu_dinner_sides", "next_week_fri_lunch_main", "next_week_fri_lunch_sides", "next_week_fri_dinner_main", "next_week_fri_dinner_sides", "next_week_sat_lunch_main", "next_week_sat_lunch_sides", "next_week_sat_dinner_main", "next_week_sat_dinner_sides", "updated_at", "created_at")
     VALUES ('23 – 28 Nov', 'Paneer Methi Malai with methi roti', 'Kachumber salad, Dal fry, Beans poriyal', 'Chettinad Soya Curry with ragi roti', 'Sprouts chaat, Rasam dal, Cabbage thoran', 'Tofu Tikka Masala with jowar roti', 'Beetroot salad, Light dal makhani, Bhindi do pyaza', 'Palak Paneer with multigrain roti', 'Corn chana salad, Moong dal, Lauki chana', 'Kolhapuri Paneer with bajra roti', 'Koshimbir, Varan, Matki usal', 'Hariyali Tofu with oats roti', 'Chickpea salad, Toor dal tadka, Mixed veg sabzi', 'Rajma Masala Bowl with brown rice', 'Carrot peanut salad, Jeera dal, Aloo methi', 'Kerala Veg Stew with coconut roti', 'Moong sprout salad, Sambar, Avial', 'Kadhai Paneer with carrot roti', 'Sprouted moong salad, Matki dal tadka, Capsicum besan subzi', 'No-Butter Soya Masala with dill multigrain roti', 'Mixed bean salad, Homestyle chole, Aloo gobi', 'Khurchan Paneer with soya roti', 'Cucumber mint salad, Dal panchmel, Gajar matar', 'Lahori Tofu Curry with palak roti', 'Bombay sprouts salad, Lobiya masala, Parwal bhujiya', '30 Nov – 5 Dec', 'Paneer Lababdar with bajra roti', 'Cabbage carrot slaw, Dal tadka, Turai chana', 'Goan Tofu Xacuti with brown rice', 'Kosambari, Masoor dal, Beans foogath', 'Soya Keema Matar with multigrain roti', 'Tomato onion salad, Panchratna dal, Kaddu sabzi', 'Paneer Pasanda (light) with methi roti', 'Sprouts salad, Kadhi, Baingan bharta', 'Chole Masala Bowl with jeera brown rice', 'Kachumber, Lauki dal, Aloo shimla', 'Mangalorean Tofu Ghassi with ragi roti', 'Cucumber peanut salad, Saaru, Beans palya', 'Achari Paneer with jowar roti', 'Beet carrot salad, Moong dal, Bhindi masala', 'Soya Rogan Josh with palak roti', 'Chana chaat, Dal palak, Gobi matar', 'Tofu Kali Mirch with oats roti', 'Corn salad, Arhar dal, Tinda masala', 'Paneer Do Pyaza with carrot roti', 'Moong chaat, Dal makhani (light), Mixed veg', 'Rajasthani Gatte Curry with missi roti', 'Kakdi raita salad, Panchmel dal, Ker sangri', 'Chettinad Paneer with ragi roti', 'Sundal, Rasam, Cabbage poriyal', now(), now())
     RETURNING "id" INTO parent;

     INSERT INTO "plan_builder_plans" ("_order", "_parent_id", "id", "label", "days", "note", "lunch_price", "dinner_price", "both_price") VALUES
       (1, parent, substr(md5(random()::text || clock_timestamp()::text), 1, 24), '1 week', 6, NULL, 129900, 129900, 249900),
       (2, parent, substr(md5(random()::text || clock_timestamp()::text), 1, 24), '2 weeks', 12, 'Save 5%', 249900, 249900, 479900),
       (3, parent, substr(md5(random()::text || clock_timestamp()::text), 1, 24), '4 weeks', 24, 'Save 10%', 479900, 479900, 919900);

     INSERT INTO "plan_builder_option_groups" ("_order", "_parent_id", "id", "title", "hint")
     VALUES (1, parent, juice, 'Juice', 'One 250 ml bottle a day, with your first meal.');

     INSERT INTO "plan_builder_option_groups_choices" ("_order", "_parent_id", "id", "label", "detail", "extra_per_day") VALUES
       (1, juice, substr(md5(random()::text || clock_timestamp()::text), 1, 24), 'Normal juice', 'Seasonal fruit, no added sugar', 0),
       (2, juice, substr(md5(random()::text || clock_timestamp()::text), 1, 24), 'Detox juice', 'Amla, cucumber, mint and ginger', 3000);
   END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "plan_builder_option_groups_choices";
   DROP TABLE IF EXISTS "plan_builder_option_groups";
   DROP TABLE IF EXISTS "plan_builder_plans";
   DROP TABLE IF EXISTS "plan_builder";
   -- Lines without a product cannot be kept once the column is required again.
   DELETE FROM "checkout_intents_items" WHERE "product_id" IS NULL;
   ALTER TABLE "checkout_intents_items" ALTER COLUMN "product_id" SET NOT NULL;
  `)
}
