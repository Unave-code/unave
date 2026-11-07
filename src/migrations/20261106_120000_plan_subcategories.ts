import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * The subcategory layer inside the plan categories (spec 0008, AC-8 and AC-9).
 *
 * The kitchen keeps a list of finer labels per category, and every plan carries
 * one. This creates the option list as its own table, then adds a nullable
 * relation column on `plans`.
 *
 * The column stays nullable on purpose. The three plans that existed before
 * this revision are not touched, so no dev push or production migrate truncates
 * a row: staff assign each plan a subcategory in the admin, and Payload's
 * validation enforces the field from deployment on.
 *
 * Every step is guarded, because a database managed by dev push already holds
 * some of this, and `ADD CONSTRAINT` has no `IF NOT EXISTS`.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
     CREATE TYPE "public"."enum_subcategories_category" AS ENUM('ready-to-cook', 'ready-to-eat', 'fresh-from-produce');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;

   CREATE TABLE IF NOT EXISTS "subcategories" (
     "id" serial PRIMARY KEY NOT NULL,
     "title" varchar NOT NULL,
     "category" "public"."enum_subcategories_category" NOT NULL,
     "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
     "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
   );

   CREATE INDEX IF NOT EXISTS "subcategories_category_idx" ON "subcategories" USING btree ("category");
   CREATE INDEX IF NOT EXISTS "subcategories_updated_at_idx" ON "subcategories" USING btree ("updated_at");
   CREATE INDEX IF NOT EXISTS "subcategories_created_at_idx" ON "subcategories" USING btree ("created_at");

   -- The new collection joins Payload's locking and preferences tables like
   -- every other one; both exist by now, so the foreign keys are safe.
   ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "subcategories_id" integer;
   CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_subcategories_id_idx" ON "payload_locked_documents_rels" USING btree ("subcategories_id");

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_subcategories_fk'
     ) THEN
       ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subcategories_fk"
         FOREIGN KEY ("subcategories_id") REFERENCES "public"."subcategories"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   ALTER TABLE "payload_preferences_rels" ADD COLUMN IF NOT EXISTS "subcategories_id" integer;
   CREATE INDEX IF NOT EXISTS "payload_preferences_rels_subcategories_id_idx" ON "payload_preferences_rels" USING btree ("subcategories_id");

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'payload_preferences_rels_subcategories_fk'
     ) THEN
       ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_subcategories_fk"
         FOREIGN KEY ("subcategories_id") REFERENCES "public"."subcategories"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "subcategory_id" integer;
   CREATE INDEX IF NOT EXISTS "plans_subcategory_id_idx" ON "plans" USING btree ("subcategory_id");

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'plans_subcategory_id_subcategories_id_fk'
     ) THEN
       ALTER TABLE "plans" ADD CONSTRAINT "plans_subcategory_id_subcategories_id_fk"
         FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "plans" DROP CONSTRAINT IF EXISTS "plans_subcategory_id_subcategories_id_fk";
   ALTER TABLE "plans" DROP COLUMN IF EXISTS "subcategory_id";

   ALTER TABLE "payload_preferences_rels" DROP COLUMN IF EXISTS "subcategories_id";
   ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "subcategories_id";

   DROP TABLE IF EXISTS "subcategories";
   DROP TYPE IF EXISTS "public"."enum_subcategories_category";
  `)
}
