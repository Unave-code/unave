import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * The delivery areas global: a checkout check toggle, an intro line and an
 * ordered list of named areas with their pincodes. Every step is guarded so a
 * database already shaped by dev push takes the migration cleanly.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "delivery_areas" (
     "id" serial PRIMARY KEY NOT NULL,
     "enforce" boolean DEFAULT false,
     "intro" varchar DEFAULT 'We cook in Chennai and deliver to the areas below. Check your pincode to be sure.',
     "updated_at" timestamp(3) with time zone,
     "created_at" timestamp(3) with time zone
   );

   CREATE TABLE IF NOT EXISTS "delivery_areas_areas" (
     "_order" integer NOT NULL,
     "_parent_id" integer NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "name" varchar NOT NULL,
     "pincodes" varchar NOT NULL
   );

   CREATE INDEX IF NOT EXISTS "delivery_areas_areas_order_idx" ON "delivery_areas_areas" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "delivery_areas_areas_parent_id_idx" ON "delivery_areas_areas" USING btree ("_parent_id");

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'delivery_areas_areas_parent_id_fk'
     ) THEN
       ALTER TABLE "delivery_areas_areas" ADD CONSTRAINT "delivery_areas_areas_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."delivery_areas"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "delivery_areas_areas";
   DROP TABLE IF EXISTS "delivery_areas";`)
}
