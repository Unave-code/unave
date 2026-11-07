import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * The catalogue is renamed from plans to products (2026-11-07).
 *
 * The word "plan" leaked into the schema, the routes and every label; this
 * revision calls the thing what it is. The data does not move and no row is
 * rewritten: the `plans` table becomes `products`, its two child tables and the
 * two select enum types follow, and the order line that copied a plan id and
 * title now copies a product id and title.
 *
 * The chrome the site sells through is CMS data, not code, so the stored menu
 * link, the header button and the footer link that pointed at `/plans` are
 * rewritten here too; without this a deployed database would keep sending
 * customers to a route that no longer exists.
 *
 * Every statement is guarded. A database managed by dev push may already hold
 * some of these names, and the guarded `DO` blocks either make the change or
 * quietly leave an already-correct schema alone. Constraint and index names are
 * cosmetic to Payload, which addresses columns rather than names, so they are
 * renamed best-effort and skipped when the target already exists.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Tables. The child tables are renamed after their parent, though the order
  // does not matter: foreign keys follow the rename automatically.
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plans')
         AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
        ALTER TABLE "plans" RENAME TO "products";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plans_durations')
         AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products_durations') THEN
        ALTER TABLE "plans_durations" RENAME TO "products_durations";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plans_points')
         AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products_points') THEN
        ALTER TABLE "plans_points" RENAME TO "products_points";
      END IF;
    END $$;
  `)

  // The two select types. Renaming a type leaves every column that uses it
  // pointing at the same type under its new name.
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_plans_category')
         AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_products_category') THEN
        ALTER TYPE "enum_plans_category" RENAME TO "enum_products_category";
      END IF;
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_plans_audience')
         AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_products_audience') THEN
        ALTER TYPE "enum_plans_audience" RENAME TO "enum_products_audience";
      END IF;
    END $$;
  `)

  // The copied line on an order, and the admin's locked-document relation.
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders_items' AND column_name = 'plan_id') THEN
        ALTER TABLE "orders_items" RENAME COLUMN "plan_id" TO "product_id";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders_items' AND column_name = 'plan_title') THEN
        ALTER TABLE "orders_items" RENAME COLUMN "plan_title" TO "product_title";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payload_locked_documents_rels' AND column_name = 'plans_id') THEN
        ALTER TABLE "payload_locked_documents_rels" RENAME COLUMN "plans_id" TO "products_id";
      END IF;
    END $$;
  `)

  // Constraint names, best-effort. Primary key and unique constraints on the
  // renamed tables are handled by the `plans%` sweep; the order line and the
  // locked-document relation do not start with `plans` and are named directly.
  await db.execute(sql`
    DO $$
    DECLARE r record;
    DECLARE next_name text;
    BEGIN
      FOR r IN
        SELECT conname, conrelid::regclass AS tbl
        FROM pg_constraint
        WHERE connamespace = 'public'::regnamespace AND conname LIKE 'plans%'
      LOOP
        next_name := regexp_replace(r.conname, '^plans', 'products');
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = next_name) THEN
          EXECUTE format('ALTER TABLE %s RENAME CONSTRAINT %I TO %I', r.tbl, r.conname, next_name);
        END IF;
      END LOOP;

      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_items_plan_id_plans_id_fk')
         AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_items_product_id_products_id_fk') THEN
        ALTER TABLE "orders_items" RENAME CONSTRAINT "orders_items_plan_id_plans_id_fk" TO "orders_items_product_id_products_id_fk";
      END IF;

      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_plans_fk')
         AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_products_fk') THEN
        ALTER TABLE "payload_locked_documents_rels" RENAME CONSTRAINT "payload_locked_documents_rels_plans_fk" TO "payload_locked_documents_rels_products_fk";
      END IF;
    END $$;
  `)

  // Index names, best-effort. The `plans` prefix sweep covers the renamed
  // tables' own indexes; the two that do not start with `plans` (the
  // locked-document relation and the order line, whose index is named for the
  // field rather than the column) are named directly.
  await db.execute(sql`
    DO $$
    DECLARE r record;
    DECLARE next_name text;
    BEGIN
      FOR r IN
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'public'
          AND (
            indexname LIKE 'plans%'
            OR indexname IN ('payload_locked_documents_rels_plans_id_idx', 'orders_items_plan_idx')
          )
      LOOP
        IF r.indexname = 'payload_locked_documents_rels_plans_id_idx' THEN
          next_name := 'payload_locked_documents_rels_products_id_idx';
        ELSIF r.indexname = 'orders_items_plan_idx' THEN
          next_name := 'orders_items_product_idx';
        ELSE
          next_name := regexp_replace(r.indexname, '^plans', 'products');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = next_name) THEN
          EXECUTE format('ALTER INDEX %I RENAME TO %I', r.indexname, next_name);
        END IF;
      END LOOP;
    END $$;
  `)

  // The chrome the site sells through, which is CMS data. A link that still
  // points at `/plans` would dead-end, so both the address and the label move.
  await db.execute(sql`
    UPDATE "header" SET "cta_url" = '/products', "cta_label" = 'Browse the products'
    WHERE "cta_url" = '/plans';
  `)
  await db.execute(sql`
    UPDATE "header_nav_items" SET "link_url" = '/products', "link_label" = 'Products'
    WHERE "link_url" = '/plans';
  `)
  await db.execute(sql`
    UPDATE "footer_columns_links" SET "link_url" = '/products', "link_label" = 'Products'
    WHERE "link_url" = '/plans';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "header" SET "cta_url" = '/plans', "cta_label" = 'Browse the plans'
    WHERE "cta_url" = '/products';
  `)
  await db.execute(sql`
    UPDATE "header_nav_items" SET "link_url" = '/plans', "link_label" = 'Plans'
    WHERE "link_url" = '/products';
  `)
  await db.execute(sql`
    UPDATE "footer_columns_links" SET "link_url" = '/plans', "link_label" = 'Plans'
    WHERE "link_url" = '/products';
  `)

  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders_items' AND column_name = 'product_title') THEN
        ALTER TABLE "orders_items" RENAME COLUMN "product_title" TO "plan_title";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders_items' AND column_name = 'product_id') THEN
        ALTER TABLE "orders_items" RENAME COLUMN "product_id" TO "plan_id";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payload_locked_documents_rels' AND column_name = 'products_id') THEN
        ALTER TABLE "payload_locked_documents_rels" RENAME COLUMN "products_id" TO "plans_id";
      END IF;
    END $$;
  `)

  // Constraint names, best-effort, the mirror of the up sweep.
  await db.execute(sql`
    DO $$
    DECLARE r record;
    DECLARE next_name text;
    BEGIN
      FOR r IN
        SELECT conname, conrelid::regclass AS tbl
        FROM pg_constraint
        WHERE connamespace = 'public'::regnamespace AND conname LIKE 'products%'
      LOOP
        next_name := regexp_replace(r.conname, '^products', 'plans');
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = next_name) THEN
          EXECUTE format('ALTER TABLE %s RENAME CONSTRAINT %I TO %I', r.tbl, r.conname, next_name);
        END IF;
      END LOOP;

      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_items_product_id_products_id_fk')
         AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_items_plan_id_plans_id_fk') THEN
        ALTER TABLE "orders_items" RENAME CONSTRAINT "orders_items_product_id_products_id_fk" TO "orders_items_plan_id_plans_id_fk";
      END IF;

      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_products_fk')
         AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_plans_fk') THEN
        ALTER TABLE "payload_locked_documents_rels" RENAME CONSTRAINT "payload_locked_documents_rels_products_fk" TO "payload_locked_documents_rels_plans_fk";
      END IF;
    END $$;
  `)

  // Index names, best-effort, the mirror of the up sweep.
  await db.execute(sql`
    DO $$
    DECLARE r record;
    DECLARE next_name text;
    BEGIN
      FOR r IN
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'public'
          AND (
            indexname LIKE 'products%'
            OR indexname IN ('payload_locked_documents_rels_products_id_idx', 'orders_items_product_idx')
          )
      LOOP
        IF r.indexname = 'payload_locked_documents_rels_products_id_idx' THEN
          next_name := 'payload_locked_documents_rels_plans_id_idx';
        ELSIF r.indexname = 'orders_items_product_idx' THEN
          next_name := 'orders_items_plan_idx';
        ELSE
          next_name := regexp_replace(r.indexname, '^products', 'plans');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = next_name) THEN
          EXECUTE format('ALTER INDEX %I RENAME TO %I', r.indexname, next_name);
        END IF;
      END LOOP;
    END $$;
  `)

  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_products_category')
         AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_plans_category') THEN
        ALTER TYPE "enum_products_category" RENAME TO "enum_plans_category";
      END IF;
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_products_audience')
         AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_plans_audience') THEN
        ALTER TYPE "enum_products_audience" RENAME TO "enum_plans_audience";
      END IF;
    END $$;
  `)

  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products_points')
         AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plans_points') THEN
        ALTER TABLE "products_points" RENAME TO "plans_points";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products_durations')
         AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plans_durations') THEN
        ALTER TABLE "products_durations" RENAME TO "plans_durations";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products')
         AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plans') THEN
        ALTER TABLE "products" RENAME TO "plans";
      END IF;
    END $$;
  `)
}
