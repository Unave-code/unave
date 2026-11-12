import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

import {
  assignUniqueSubcategorySlugs,
  type SubcategorySlugSource,
} from '@/collections/Subcategories/hooks/autoSubcategorySlug'

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const subcategories: SubcategorySlugSource[] = []

  for (let page = 1; ; page++) {
    const result = await payload.find({
      collection: 'subcategories',
      depth: 0,
      limit: 1000,
      overrideAccess: true,
      page,
      sort: 'id',
    })

    subcategories.push(...(result.docs as SubcategorySlugSource[]))
    if (!result.hasNextPage) break
  }

  for (const assignment of assignUniqueSubcategorySlugs(subcategories)) {
    if (assignment.slug === assignment.previousSlug) continue

    await payload.db.updateOne({
      collection: 'subcategories',
      data: { slug: assignment.slug },
      id: assignment.id,
    })
  }

  await db.execute(sql`
    ALTER TABLE "public"."subcategories"
    ALTER COLUMN "slug" SET NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS "subcategories_slug_idx"
    ON "public"."subcategories" USING btree ("slug");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "public"."subcategories_slug_idx";
    ALTER TABLE "public"."subcategories" ALTER COLUMN "slug" DROP NOT NULL;
  `)
}
