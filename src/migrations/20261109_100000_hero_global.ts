import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * The home hero global (spec: home hero carousel, shipped in 7419c91).
 *
 * The `hero` global went out before its tables did: dev push had created
 * `hero` and `hero_slides` on the development database, but no migration
 * carried them to migrate-managed databases. The home page reads the hero on
 * every request, so on those databases every visit died with
 * `relation "hero" does not exist`. This migration builds the missing
 * shapes; an empty global renders the code-side default slide, so no data
 * backfill is needed.
 *
 * Every step is guarded, because a database managed by dev push may already
 * hold these tables, and `ADD CONSTRAINT` has no `IF NOT EXISTS`.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "hero" (
     "id" serial PRIMARY KEY NOT NULL,
     "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
     "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
   );

   CREATE TABLE IF NOT EXISTS "hero_slides" (
     "_order" integer NOT NULL,
     "_parent_id" integer NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "eyebrow" varchar,
     "headline" varchar NOT NULL,
     "sub_line" varchar,
     "image_id" integer,
     "primary_label" varchar,
     "primary_whatsapp" boolean DEFAULT true,
     "primary_url" varchar,
     "primary_new_tab" boolean DEFAULT false,
     "secondary_label" varchar,
     "secondary_url" varchar,
     "secondary_new_tab" boolean DEFAULT false
   );

   CREATE INDEX IF NOT EXISTS "hero_slides_order_idx" ON "hero_slides" ("_order");
   CREATE INDEX IF NOT EXISTS "hero_slides_parent_id_idx" ON "hero_slides" ("_parent_id");
   CREATE INDEX IF NOT EXISTS "hero_slides_image_idx" ON "hero_slides" ("image_id");

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'hero_slides_parent_id_fk'
     ) THEN
       ALTER TABLE "hero_slides" ADD CONSTRAINT "hero_slides_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."hero"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'hero_slides_image_id_media_id_fk'
     ) THEN
       ALTER TABLE "hero_slides" ADD CONSTRAINT "hero_slides_image_id_media_id_fk"
         FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "hero_slides";
   DROP TABLE IF EXISTS "hero";`)
}
