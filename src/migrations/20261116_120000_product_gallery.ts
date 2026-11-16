import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Up to four more photos per product (`products_gallery`), shown after the
 * main photo on the product page and on the card's hover. Guarded like the
 * other migrations, because development pushes its own schema and may already
 * have the table.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "products_gallery" (
     "_order" integer NOT NULL,
     "_parent_id" integer NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "image_id" integer
   );

   CREATE INDEX IF NOT EXISTS "products_gallery_order_idx" ON "products_gallery" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "products_gallery_parent_id_idx" ON "products_gallery" USING btree ("_parent_id");
   CREATE INDEX IF NOT EXISTS "products_gallery_image_idx" ON "products_gallery" USING btree ("image_id");

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'products_gallery_parent_id_fk'
     ) THEN
       ALTER TABLE "products_gallery" ADD CONSTRAINT "products_gallery_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'products_gallery_image_id_media_id_fk'
     ) THEN
       ALTER TABLE "products_gallery" ADD CONSTRAINT "products_gallery_image_id_media_id_fk"
         FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "products_gallery" CASCADE;
  `)
}
