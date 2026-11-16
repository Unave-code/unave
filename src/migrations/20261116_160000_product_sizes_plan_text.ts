import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Sizes for one-time products (`products_sizes`), a meal plan's own "How your
 * plan works" text (`products.how_it_works`), and the Product page global that
 * holds the shared text. Guarded, because development pushes its own schema.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "products_sizes" (
     "_order" integer NOT NULL,
     "_parent_id" integer NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "label" varchar NOT NULL,
     "price" numeric NOT NULL,
     "compare_at_price" numeric
   );

   CREATE INDEX IF NOT EXISTS "products_sizes_order_idx" ON "products_sizes" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "products_sizes_parent_id_idx" ON "products_sizes" USING btree ("_parent_id");

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'products_sizes_parent_id_fk'
     ) THEN
       ALTER TABLE "products_sizes" ADD CONSTRAINT "products_sizes_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "how_it_works" varchar;

   CREATE TABLE IF NOT EXISTS "product_page" (
     "id" serial PRIMARY KEY NOT NULL,
     "plan_how_it_works" varchar DEFAULT 'Choose a plan and pay once at checkout.
Our team calls you to confirm your start date and delivery details.
Meals arrive fresh from our kitchen for every day of your plan.
Need a pause or a change? Message us and we will sort it out.',
     "updated_at" timestamp(3) with time zone,
     "created_at" timestamp(3) with time zone
   );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "products_sizes" CASCADE;
   ALTER TABLE "products" DROP COLUMN IF EXISTS "how_it_works";
   DROP TABLE IF EXISTS "product_page" CASCADE;
  `)
}
