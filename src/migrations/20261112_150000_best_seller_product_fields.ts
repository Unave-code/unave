import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."products"
    ADD COLUMN IF NOT EXISTS "compare_at_price" numeric,
    ADD COLUMN IF NOT EXISTS "pack_size" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."products"
    DROP COLUMN IF EXISTS "compare_at_price",
    DROP COLUMN IF EXISTS "pack_size";
  `)
}
