import { MigrateUpArgs } from '@payloadcms/db-postgres'

import { firstFreeSlug, slugifyTitle } from '@/collections/Products/hooks/autoProductSlug'
import type { Product } from '@/payload-types'

/**
 * A product's slug becomes the address it can actually be reached at
 * (2026-11-11).
 *
 * The slug is both the label the admin keeps and the last segment of the
 * product's web address (`/products/<slug>`), so the two have to be the same
 * string: the page hands the slug to the browser, and the browser hands it
 * back when the link is followed. A slug that cannot survive that trip is a
 * page nothing reaches. The rows written before the slug hook normalised its
 * input kept a trailing space ("sambar-podi "), a capital letter
 * ("Gongura-Pachadi") or a slash ("Mixed-Pulao/Biryani "); the browser strips
 * the trailing space before it asks, so every one of them read as not found,
 * and the slash split one product's address into two path segments that match
 * no route at all.
 *
 * Each row is rewritten through the collection's own rule — `slugifyTitle` for
 * the value and `firstFreeSlug` for uniqueness and for keeping clear of the
 * three reserved category slugs — so the catalogue after this migration is
 * exactly what the hook would have stored all along. A slug that is already
 * clean passes through unchanged, so only the broken rows move. The write goes
 * through `payload.db.updateOne` rather than `payload.update` on purpose: this
 * is a repair of an address, not an edit of a product, and a row old enough to
 * carry a broken slug may also predate a field that is now required, which the
 * collection's own validation would refuse to save.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const products = await payload.find({
    collection: 'products',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
  })

  for (const product of products.docs as Product[]) {
    const base = slugifyTitle(product.slug) || 'product'
    const next = await firstFreeSlug(payload, base, product.id)

    if (next === product.slug) continue

    await payload.db.updateOne({
      collection: 'products',
      data: { slug: next },
      id: product.id,
    })
  }
}

export async function down(): Promise<void> {
  // Nothing to restore. The slugs this migration replaced were not addresses
  // the site could serve, so putting them back would only put the 404s back.
}
