import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Photos for the delivery areas page: a top band photo, an optional photo per
 * area, and up to three "kitchen to your door" photos. Guarded so a database
 * shaped by dev push takes it.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "delivery_areas" ADD COLUMN IF NOT EXISTS "hero_image_id" integer;
   ALTER TABLE "delivery_areas_areas" ADD COLUMN IF NOT EXISTS "photo_id" integer;

   CREATE TABLE IF NOT EXISTS "delivery_areas_photos" (
     "_order" integer NOT NULL,
     "_parent_id" integer NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "image_id" integer NOT NULL,
     "caption" varchar
   );

   CREATE INDEX IF NOT EXISTS "delivery_areas_hero_image_idx" ON "delivery_areas" USING btree ("hero_image_id");
   CREATE INDEX IF NOT EXISTS "delivery_areas_areas_photo_idx" ON "delivery_areas_areas" USING btree ("photo_id");
   CREATE INDEX IF NOT EXISTS "delivery_areas_photos_order_idx" ON "delivery_areas_photos" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "delivery_areas_photos_parent_id_idx" ON "delivery_areas_photos" USING btree ("_parent_id");
   CREATE INDEX IF NOT EXISTS "delivery_areas_photos_image_idx" ON "delivery_areas_photos" USING btree ("image_id");

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_areas_hero_image_id_media_id_fk') THEN
       ALTER TABLE "delivery_areas" ADD CONSTRAINT "delivery_areas_hero_image_id_media_id_fk"
         FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_areas_areas_photo_id_media_id_fk') THEN
       ALTER TABLE "delivery_areas_areas" ADD CONSTRAINT "delivery_areas_areas_photo_id_media_id_fk"
         FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_areas_photos_image_id_media_id_fk') THEN
       ALTER TABLE "delivery_areas_photos" ADD CONSTRAINT "delivery_areas_photos_image_id_media_id_fk"
         FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_areas_photos_parent_id_fk') THEN
       ALTER TABLE "delivery_areas_photos" ADD CONSTRAINT "delivery_areas_photos_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."delivery_areas"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "delivery_areas_photos";
   ALTER TABLE "delivery_areas_areas" DROP COLUMN IF EXISTS "photo_id";
   ALTER TABLE "delivery_areas" DROP COLUMN IF EXISTS "hero_image_id";`)
}
