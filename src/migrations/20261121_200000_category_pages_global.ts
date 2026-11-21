import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * The Category pages global: one header photo per product category page.
 * Guarded so a database already shaped by dev push takes it cleanly.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "category_pages" (
     "id" serial PRIMARY KEY NOT NULL,
     "ready_to_eat_id" integer,
     "ready_to_cook_id" integer,
     "fresh_from_produce_id" integer,
     "updated_at" timestamp(3) with time zone,
     "created_at" timestamp(3) with time zone
   );

   CREATE INDEX IF NOT EXISTS "category_pages_ready_to_eat_idx" ON "category_pages" USING btree ("ready_to_eat_id");
   CREATE INDEX IF NOT EXISTS "category_pages_ready_to_cook_idx" ON "category_pages" USING btree ("ready_to_cook_id");
   CREATE INDEX IF NOT EXISTS "category_pages_fresh_from_produce_idx" ON "category_pages" USING btree ("fresh_from_produce_id");

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_pages_ready_to_eat_id_media_id_fk') THEN
       ALTER TABLE "category_pages" ADD CONSTRAINT "category_pages_ready_to_eat_id_media_id_fk"
         FOREIGN KEY ("ready_to_eat_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
     END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_pages_ready_to_cook_id_media_id_fk') THEN
       ALTER TABLE "category_pages" ADD CONSTRAINT "category_pages_ready_to_cook_id_media_id_fk"
         FOREIGN KEY ("ready_to_cook_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
     END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_pages_fresh_from_produce_id_media_id_fk') THEN
       ALTER TABLE "category_pages" ADD CONSTRAINT "category_pages_fresh_from_produce_id_media_id_fk"
         FOREIGN KEY ("fresh_from_produce_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "category_pages";
  `)
}
