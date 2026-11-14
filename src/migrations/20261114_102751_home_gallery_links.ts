import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/** Adds the three editable, linked photos below the home page slider. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."hero"
      ADD COLUMN IF NOT EXISTS "gallery_image1_image_id" integer,
      ADD COLUMN IF NOT EXISTS "gallery_image1_link" varchar,
      ADD COLUMN IF NOT EXISTS "gallery_image2_image_id" integer,
      ADD COLUMN IF NOT EXISTS "gallery_image2_link" varchar,
      ADD COLUMN IF NOT EXISTS "gallery_image3_image_id" integer,
      ADD COLUMN IF NOT EXISTS "gallery_image3_link" varchar;

    CREATE INDEX IF NOT EXISTS "hero_gallery_image1_gallery_image1_image_idx"
      ON "public"."hero" USING btree ("gallery_image1_image_id");
    CREATE INDEX IF NOT EXISTS "hero_gallery_image2_gallery_image2_image_idx"
      ON "public"."hero" USING btree ("gallery_image2_image_id");
    CREATE INDEX IF NOT EXISTS "hero_gallery_image3_gallery_image3_image_idx"
      ON "public"."hero" USING btree ("gallery_image3_image_id");

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'hero_gallery_image1_image_id_media_id_fk'
      ) THEN
        ALTER TABLE "public"."hero" ADD CONSTRAINT "hero_gallery_image1_image_id_media_id_fk"
          FOREIGN KEY ("gallery_image1_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'hero_gallery_image2_image_id_media_id_fk'
      ) THEN
        ALTER TABLE "public"."hero" ADD CONSTRAINT "hero_gallery_image2_image_id_media_id_fk"
          FOREIGN KEY ("gallery_image2_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'hero_gallery_image3_image_id_media_id_fk'
      ) THEN
        ALTER TABLE "public"."hero" ADD CONSTRAINT "hero_gallery_image3_image_id_media_id_fk"
          FOREIGN KEY ("gallery_image3_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."hero"
      DROP COLUMN IF EXISTS "gallery_image1_image_id",
      DROP COLUMN IF EXISTS "gallery_image1_link",
      DROP COLUMN IF EXISTS "gallery_image2_image_id",
      DROP COLUMN IF EXISTS "gallery_image2_link",
      DROP COLUMN IF EXISTS "gallery_image3_image_id",
      DROP COLUMN IF EXISTS "gallery_image3_link";
  `)
}
