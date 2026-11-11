import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { firstFreeSlug, slugifyTitle } from '@/collections/Products/hooks/autoProductSlug'
import type { Product } from '@/payload-types'

/**
 * Giving the products written before the slug hook normalised its input an
 * address the site can actually serve (2026-11-11).
 *
 * A product's slug is the last segment of its web address, so the stored slug
 * and the visited address have to be the same string. The rows written before
 * the hook trimmed and lowercased its input kept a trailing space
 * ("sambar-podi "), a capital letter ("Gongura-Pachadi") or a slash
 * ("Mixed-Pulao/Biryani "); the browser strips a trailing space before it asks
 * the server, so every one of them read as not found, and the slash split one
 * product's address into two segments that match no route.
 *
 * The migration of the same date repairs the production rows, which only ever
 * migrate. A database managed by dev push never runs it, so this script does
 * the same repair there: it reads every product, works out the address with
 * the same two functions the hook uses — `slugifyTitle` for the value and
 * `firstFreeSlug` for uniqueness and for staying clear of the reserved
 * category slugs — and writes it back. A slug that is already clean is left
 * alone. The write goes through the database rather than `payload.update`
 * because this is a repair of an address, not an edit of a product, and a row
 * old enough to carry a broken slug may also predate a field that is now
 * required. It is safe to run more than once.
 *
 * Run with `npx payload run ./src/scripts/normalize-product-slugs.ts`.
 */

const payload = await getPayload({ config: configPromise })

const products = await payload.find({
  collection: 'products',
  depth: 0,
  limit: 1000,
  overrideAccess: true,
  pagination: false,
})

const changed: Array<{ from: string; id: number | string; to: string }> = []

for (const product of products.docs as Product[]) {
  const base = slugifyTitle(product.slug) || 'product'
  const next = await firstFreeSlug(payload, base, product.id)

  if (next === product.slug) continue

  await payload.db.updateOne({
    collection: 'products',
    data: { slug: next },
    id: product.id,
  })

  changed.push({ from: product.slug, id: product.id, to: next })
}

console.log(JSON.stringify({ changed, checked: products.docs.length }, null, 2))

process.exit(0)
