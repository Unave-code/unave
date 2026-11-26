import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * The header lost its call-to-action button, but its columns stayed behind,
 * with cta_label and cta_url NOT NULL. Payload saves a global as an insert on
 * conflict update that leaves those columns out, so every header save failed
 * on the not-null constraint. Drop the three leftover columns.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "header" DROP COLUMN IF EXISTS "cta_label";
   ALTER TABLE "header" DROP COLUMN IF EXISTS "cta_url";
   ALTER TABLE "header" DROP COLUMN IF EXISTS "cta_new_tab";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "header" ADD COLUMN IF NOT EXISTS "cta_label" varchar;
   ALTER TABLE "header" ADD COLUMN IF NOT EXISTS "cta_url" varchar;
   ALTER TABLE "header" ADD COLUMN IF NOT EXISTS "cta_new_tab" boolean DEFAULT false;
  `)
}
