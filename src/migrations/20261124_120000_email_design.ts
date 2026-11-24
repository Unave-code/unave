import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Staff-editable email images and content (Settings → Email settings → Images
 * and extra content), and the PNG `email` size every new media upload gets so
 * Outlook for Windows can show it. Guarded so a database already shaped by dev
 * push takes it cleanly.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "design_header_image_id" integer;
   ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "design_order_content" jsonb;
   ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "design_footer_content" jsonb;
   CREATE INDEX IF NOT EXISTS "email_settings_design_design_header_image_idx" ON "email_settings" USING btree ("design_header_image_id");

   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_settings_design_header_image_id_media_id_fk') THEN
       ALTER TABLE "email_settings" ADD CONSTRAINT "email_settings_design_header_image_id_media_id_fk"
         FOREIGN KEY ("design_header_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_email_url" varchar;
   ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_email_width" numeric;
   ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_email_height" numeric;
   ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_email_mime_type" varchar;
   ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_email_filesize" numeric;
   ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_email_filename" varchar;
   CREATE INDEX IF NOT EXISTS "media_sizes_email_sizes_email_filename_idx" ON "media" USING btree ("sizes_email_filename");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "email_settings" DROP CONSTRAINT IF EXISTS "email_settings_design_header_image_id_media_id_fk";
   DROP INDEX IF EXISTS "email_settings_design_design_header_image_idx";
   ALTER TABLE "email_settings" DROP COLUMN IF EXISTS "design_header_image_id";
   ALTER TABLE "email_settings" DROP COLUMN IF EXISTS "design_order_content";
   ALTER TABLE "email_settings" DROP COLUMN IF EXISTS "design_footer_content";

   DROP INDEX IF EXISTS "media_sizes_email_sizes_email_filename_idx";
   ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_email_url";
   ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_email_width";
   ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_email_height";
   ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_email_mime_type";
   ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_email_filesize";
   ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_email_filename";
  `)
}
