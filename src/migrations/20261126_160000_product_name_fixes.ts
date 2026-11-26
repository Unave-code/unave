import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Product names and addresses with typos, fixed once in the data.
 *
 * Each rename only touches the row still holding the old slug and title, so a
 * product the kitchen has already corrected (or deleted) is left alone. The
 * old addresses keep working through permanent redirects in redirects.ts.
 * Every title also loses stray spaces at its ends or in the middle, which
 * printed as a double space before "| UNAVE" in the page title.
 */
const RENAMES = [
  { fromSlug: 'coriender', toSlug: 'coriander', from: 'Coriender', to: 'Coriander' },
  {
    fromSlug: 'panner-tikka-sandwich',
    toSlug: 'paneer-tikka-sandwich',
    from: 'Panner',
    to: 'Paneer',
  },
  {
    fromSlug: 'apply-beetroot-carrot',
    toSlug: 'apple-beetroot-carrot',
    from: 'Apply',
    to: 'Apple',
  },
] as const

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const rename of RENAMES) {
    await db.execute(sql`
      UPDATE "products"
      SET "slug" = ${rename.toSlug},
          "title" = replace("title", ${rename.from}, ${rename.to})
      WHERE "slug" = ${rename.fromSlug}
        AND NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = ${rename.toSlug})
    `)
  }

  await db.execute(sql`
    UPDATE "products"
    SET "title" = regexp_replace(btrim("title"), '\\s+', ' ', 'g')
    WHERE "title" <> regexp_replace(btrim("title"), '\\s+', ' ', 'g')
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const rename of RENAMES) {
    await db.execute(sql`
      UPDATE "products"
      SET "slug" = ${rename.fromSlug},
          "title" = replace("title", ${rename.to}, ${rename.from})
      WHERE "slug" = ${rename.toSlug}
        AND NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = ${rename.fromSlug})
    `)
  }
}
