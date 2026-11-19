import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Audiences become a list staff manage in the admin instead of three fixed
 * options.
 *
 * Creates the `audiences` table, seeds it with the three audiences the select
 * used to offer (same slugs, so old `?audience=kids` links keep working), adds
 * `products.audience_id`, copies every product's old value across, then drops
 * the old enum column. Every step is guarded, because a database managed by dev
 * push may already hold some of this.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "audiences" (
     "id" serial PRIMARY KEY NOT NULL,
     "title" varchar NOT NULL,
     "slug" varchar NOT NULL,
     "position" numeric DEFAULT 0,
     "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
     "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
   );

   CREATE UNIQUE INDEX IF NOT EXISTS "audiences_slug_idx" ON "audiences" USING btree ("slug");
   CREATE INDEX IF NOT EXISTS "audiences_updated_at_idx" ON "audiences" USING btree ("updated_at");
   CREATE INDEX IF NOT EXISTS "audiences_created_at_idx" ON "audiences" USING btree ("created_at");

   INSERT INTO "audiences" ("title", "slug", "position") VALUES
     ('Kids', 'kids', 1),
     ('Adults', 'adults', 2),
     ('Special', 'special', 3)
   ON CONFLICT ("slug") DO NOTHING;

   ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "audiences_id" integer;
   CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_audiences_id_idx" ON "payload_locked_documents_rels" USING btree ("audiences_id");

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_audiences_fk'
     ) THEN
       ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audiences_fk"
         FOREIGN KEY ("audiences_id") REFERENCES "public"."audiences"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   ALTER TABLE "payload_preferences_rels" ADD COLUMN IF NOT EXISTS "audiences_id" integer;
   CREATE INDEX IF NOT EXISTS "payload_preferences_rels_audiences_id_idx" ON "payload_preferences_rels" USING btree ("audiences_id");

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'payload_preferences_rels_audiences_fk'
     ) THEN
       ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_audiences_fk"
         FOREIGN KEY ("audiences_id") REFERENCES "public"."audiences"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "audience_id" integer;
   CREATE INDEX IF NOT EXISTS "products_audience_idx" ON "products" USING btree ("audience_id");

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'products_audience_id_audiences_id_fk'
     ) THEN
       ALTER TABLE "products" ADD CONSTRAINT "products_audience_id_audiences_id_fk"
         FOREIGN KEY ("audience_id") REFERENCES "public"."audiences"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   -- Carry each product's old fixed audience over, then retire the old column.
   DO $$ BEGIN
     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'audience'
     ) THEN
       EXECUTE 'UPDATE "products" p SET "audience_id" = a."id"
                FROM "audiences" a
                WHERE p."audience_id" IS NULL AND a."slug" = p."audience"::text';
       ALTER TABLE "products" DROP COLUMN "audience";
     END IF;
   END $$;

   DROP TYPE IF EXISTS "public"."enum_products_audience";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
     CREATE TYPE "public"."enum_products_audience" AS ENUM('kids', 'adults', 'special');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;

   ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "audience" "public"."enum_products_audience";

   UPDATE "products" p SET "audience" = CASE
       WHEN a."slug" IN ('kids', 'adults', 'special') THEN a."slug"::"public"."enum_products_audience"
       ELSE 'adults'
     END
   FROM "audiences" a
   WHERE a."id" = p."audience_id";

   UPDATE "products" SET "audience" = 'adults' WHERE "audience" IS NULL;
   ALTER TABLE "products" ALTER COLUMN "audience" SET NOT NULL;

   ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_audience_id_audiences_id_fk";
   ALTER TABLE "products" DROP COLUMN IF EXISTS "audience_id";

   ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT IF EXISTS "payload_preferences_rels_audiences_fk";
   ALTER TABLE "payload_preferences_rels" DROP COLUMN IF EXISTS "audiences_id";
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_audiences_fk";
   ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "audiences_id";

   DROP TABLE IF EXISTS "audiences";
  `)
}
