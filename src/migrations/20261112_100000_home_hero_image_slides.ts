import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/** Allows the existing hero slide rows to store image-only slides. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."hero_slides"
      ALTER COLUMN "headline" DROP NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "public"."hero_slides" SET "headline" = '' WHERE "headline" IS NULL;
    ALTER TABLE "public"."hero_slides"
      ALTER COLUMN "headline" SET NOT NULL;
  `)
}
