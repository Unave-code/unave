import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Benefit cards for a product's page (`products_benefits`): an icon, a short
 * title and one line each. Guarded, because development pushes its own schema.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_products_benefits_icon') THEN
       CREATE TYPE "public"."enum_products_benefits_icon" AS ENUM(
         'leaf', 'heart', 'sparkles', 'shield', 'wheat', 'sun',
         'droplet', 'flame', 'sprout', 'apple', 'zap', 'cooking-pot'
       );
     END IF;
   END $$;

   CREATE TABLE IF NOT EXISTS "products_benefits" (
     "_order" integer NOT NULL,
     "_parent_id" integer NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "icon" "enum_products_benefits_icon" DEFAULT 'leaf' NOT NULL,
     "title" varchar NOT NULL,
     "description" varchar
   );

   CREATE INDEX IF NOT EXISTS "products_benefits_order_idx" ON "products_benefits" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "products_benefits_parent_id_idx" ON "products_benefits" USING btree ("_parent_id");

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'products_benefits_parent_id_fk'
     ) THEN
       ALTER TABLE "products_benefits" ADD CONSTRAINT "products_benefits_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "products_benefits" CASCADE;
   DROP TYPE IF EXISTS "public"."enum_products_benefits_icon";
  `)
}
