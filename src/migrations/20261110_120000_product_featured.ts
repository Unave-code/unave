import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Products carry a featured flag (2026-11-10).
 *
 * The homepage shelf used to show whichever four open products were newest, so
 * staff had no way to lead with a particular one. The flag is a plain boolean
 * beside `available`, defaulting to false: nothing is featured until someone
 * ticks it, and a kitchen that never ticks it keeps the old newest-first shelf
 * as the fallback.
 *
 * `IF NOT EXISTS` and the default keep this safe on a database managed by dev
 * push, where the column may already be there.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."products"
      ADD COLUMN IF NOT EXISTS "featured" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."products" DROP COLUMN IF EXISTS "featured";
  `)
}
