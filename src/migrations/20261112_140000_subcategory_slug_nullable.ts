import { MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "subcategories"
    ADD COLUMN IF NOT EXISTS "slug" varchar;
  `)
}

export async function down(): Promise<void> {
  // Keep the column so a rollback does not discard slugs entered by staff.
}
