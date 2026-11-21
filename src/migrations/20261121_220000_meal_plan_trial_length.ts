import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/** A plan length can be a 3-day trial. Guarded for a database shaped by dev push. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "meal_plans_prices" ADD COLUMN IF NOT EXISTS "trial" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "meal_plans_prices" DROP COLUMN IF EXISTS "trial";
  `)
}
