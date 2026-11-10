import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Each hero slide can switch its overlay on (2026-11-10).
 *
 * The home hero used to paint one fixed green scrim over every slide photo. That
 * is right for a busy photograph and wrong for a calm one, so the choice moves
 * into the admin as a per-slide checkbox. It defaults to false, which keeps the
 * site looking the way it does today; staff tick it for a slide whose photograph
 * needs help behind the words.
 *
 * `IF NOT EXISTS` and the default keep this safe on a database managed by dev
 * push, where the column may already be there.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."hero_slides"
      ADD COLUMN IF NOT EXISTS "overlay" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."hero_slides" DROP COLUMN IF EXISTS "overlay";
  `)
}
