import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * The home page testimonials global: a heading and an ordered list of written or
 * video testimonials. Every step is guarded so a database already shaped by dev
 * push takes the migration cleanly.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
     CREATE TYPE "public"."enum_testimonials_items_kind" AS ENUM('text', 'video');
   EXCEPTION
     WHEN duplicate_object THEN null;
   END $$;

   CREATE TABLE IF NOT EXISTS "testimonials" (
     "id" serial PRIMARY KEY NOT NULL,
     "heading" varchar DEFAULT 'What customers say',
     "updated_at" timestamp(3) with time zone,
     "created_at" timestamp(3) with time zone
   );

   CREATE TABLE IF NOT EXISTS "testimonials_items" (
     "_order" integer NOT NULL,
     "_parent_id" integer NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "kind" "enum_testimonials_items_kind" DEFAULT 'text' NOT NULL,
     "name" varchar NOT NULL,
     "note" varchar,
     "quote" varchar,
     "video_id" integer,
     "poster_id" integer
   );

   CREATE INDEX IF NOT EXISTS "testimonials_items_order_idx" ON "testimonials_items" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "testimonials_items_parent_id_idx" ON "testimonials_items" USING btree ("_parent_id");
   CREATE INDEX IF NOT EXISTS "testimonials_items_video_idx" ON "testimonials_items" USING btree ("video_id");
   CREATE INDEX IF NOT EXISTS "testimonials_items_poster_idx" ON "testimonials_items" USING btree ("poster_id");

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'testimonials_items_parent_id_fk'
     ) THEN
       ALTER TABLE "testimonials_items" ADD CONSTRAINT "testimonials_items_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'testimonials_items_video_id_media_id_fk'
     ) THEN
       ALTER TABLE "testimonials_items" ADD CONSTRAINT "testimonials_items_video_id_media_id_fk"
         FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'testimonials_items_poster_id_media_id_fk'
     ) THEN
       ALTER TABLE "testimonials_items" ADD CONSTRAINT "testimonials_items_poster_id_media_id_fk"
         FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "testimonials_items";
   DROP TABLE IF EXISTS "testimonials";
   DROP TYPE IF EXISTS "public"."enum_testimonials_items_kind";`)
}
