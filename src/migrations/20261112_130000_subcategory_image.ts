import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "subcategories" ADD COLUMN IF NOT EXISTS "image_id" integer;
    CREATE INDEX IF NOT EXISTS "subcategories_image_id_idx"
      ON "subcategories" USING btree ("image_id");

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'subcategories_image_id_media_id_fk'
      ) THEN
        ALTER TABLE "subcategories"
          ADD CONSTRAINT "subcategories_image_id_media_id_fk"
          FOREIGN KEY ("image_id") REFERENCES "public"."media"("id")
          ON DELETE set null ON UPDATE no action;
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "subcategories" DROP CONSTRAINT IF EXISTS "subcategories_image_id_media_id_fk";
    DROP INDEX IF EXISTS "subcategories_image_id_idx";
    ALTER TABLE "subcategories" DROP COLUMN IF EXISTS "image_id";
  `)
}
