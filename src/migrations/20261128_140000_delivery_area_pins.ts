import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Map pins for the delivery areas page: one optional "latitude, longitude" per
 * area and one for the kitchen. Guarded so a database shaped by dev push takes it.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "delivery_areas" ADD COLUMN IF NOT EXISTS "kitchen_pin" varchar;
   ALTER TABLE "delivery_areas_areas" ADD COLUMN IF NOT EXISTS "pin" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "delivery_areas_areas" DROP COLUMN IF EXISTS "pin";
   ALTER TABLE "delivery_areas" DROP COLUMN IF EXISTS "kitchen_pin";`)
}
