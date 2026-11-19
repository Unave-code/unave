import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * The product type select becomes two ticks: Combo (holds other products) and
 * Meal plan (sold by duration). `type` stays as the stored pricing kind,
 * worked out from the ticks on every save.
 *
 * Existing rows take their ticks from their type. A combo that held a meal
 * plan is folded: the plan's chosen duration becomes the combo's own duration,
 * priced at the combo's price, and the combo becomes a meal plan. A meal plan
 * item with no duration named, or a second plan in the same combo, is dropped
 * from the combo. A combo left with no items loses its Combo tick.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "combo" boolean DEFAULT false;
   ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "meal_plan" boolean DEFAULT false;

   UPDATE "products" SET
     "combo" = ("type" = 'combo'),
     "meal_plan" = ("type" = 'plan');

   DO $$
   DECLARE
     row record;
   BEGIN
     FOR row IN
       SELECT c."id" AS component_id, c."_parent_id" AS parent_id,
              c."duration_label", c."duration_days_snapshot",
              item."id" AS item_id
       FROM "products_components" c
       JOIN "products" item ON item."id" = c."product_id"
       WHERE item."type" = 'plan'
       ORDER BY c."_parent_id", c."_order"
     LOOP
       IF coalesce(trim(row."duration_label"), '') <> ''
          AND NOT EXISTS (SELECT 1 FROM "products" p WHERE p."id" = row.parent_id AND p."meal_plan")
       THEN
         INSERT INTO "products_durations" ("_order", "_parent_id", "id", "label", "days", "price")
         SELECT 1, p."id", substr(md5(random()::text || clock_timestamp()::text), 1, 24),
                row."duration_label",
                coalesce(
                  row."duration_days_snapshot",
                  (SELECT d."days" FROM "products_durations" d
                   WHERE d."_parent_id" = row.item_id
                     AND lower(trim(d."label")) = lower(trim(row."duration_label"))
                   LIMIT 1),
                  1
                ),
                p."price"
         FROM "products" p
         WHERE p."id" = row.parent_id AND p."price" IS NOT NULL;

         UPDATE "products" SET "meal_plan" = true, "type" = 'plan'
         WHERE "id" = row.parent_id
           AND EXISTS (SELECT 1 FROM "products_durations" d WHERE d."_parent_id" = row.parent_id);
       END IF;

       DELETE FROM "products_components" WHERE "id" = row.component_id;
     END LOOP;
   END $$;

   UPDATE "products" p SET "combo" = false, "type" = CASE WHEN p."meal_plan" THEN 'plan' ELSE 'one-time' END::"public"."enum_products_type"
   WHERE p."combo"
     AND NOT EXISTS (SELECT 1 FROM "products_components" c WHERE c."_parent_id" = p."id");

   UPDATE "products" p SET "from_price" = (
     SELECT min(d."price") FROM "products_durations" d WHERE d."_parent_id" = p."id" AND d."price" >= 1
   )
   WHERE p."meal_plan";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Folded combos stay meal plans; only the two tick columns are removed.
  await db.execute(sql`
   ALTER TABLE "products" DROP COLUMN IF EXISTS "combo";
   ALTER TABLE "products" DROP COLUMN IF EXISTS "meal_plan";
  `)
}
