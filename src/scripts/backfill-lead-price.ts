import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { leadPricePaise } from '@/utilities/leadPrice'

/**
 * Filling in the lead price on products that predate it (2026-11-11).
 *
 * `fromPrice` is written by a `beforeChange` hook on every save, and the
 * migration of the same date fills the column for the rows that existed when it
 * was added. A database managed by dev push gets the column without that
 * backfill, so the shelf's price filter and price sort would look broken there
 * until every product is saved once by hand.
 *
 * This script does that filling: it reads every product with no lead price,
 * works the number out with the same function the hook uses, and writes it.
 * The write goes through the database rather than `payload.update` on purpose —
 * this is a backfill of a derived column, not an edit of a product, and a row
 * old enough to predate the column also predates a required field (the
 * subcategory), so the collection's own validation would refuse to save it.
 *
 * Run with `npx payload run ./src/scripts/backfill-lead-price.ts`.
 */

const payload = await getPayload({ config: configPromise })

const missing = await payload.find({
  collection: 'products',
  depth: 0,
  limit: 500,
  overrideAccess: true,
  where: { fromPrice: { exists: false } },
})

const filled: Array<{ id: number | string; price: null | number; title: string }> = []

for (const doc of missing.docs) {
  const price = leadPricePaise(doc)

  await payload.db.updateOne({
    collection: 'products',
    data: { fromPrice: price },
    id: doc.id,
  })

  filled.push({ id: doc.id, price, title: doc.title })
}

console.log(JSON.stringify({ checked: missing.totalDocs, filled }, null, 2))

process.exit(0)
