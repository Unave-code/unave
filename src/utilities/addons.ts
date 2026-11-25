import type { Addon, Product } from '@/payload-types'

/**
 * Product add-ons (docs/addons/product-addons-flow.pdf).
 *
 * Staff attach up to six add-ons to a single item or a combo; the customer
 * ticks any of them on the product page. Only add-on ids travel in the cart
 * cookie: every title and price comes from the live add-on record here, so a
 * tampered cookie can never lower a price or attach an extra the product does
 * not offer.
 */

export const MAX_ADDONS = 6

export type ProductAddon = {
  id: number
  note: string
  /** Paise, charged once per item. */
  price: number
  title: string
}

/** The product's add-ons a customer can tick now: populated, available, priced, in the staff's order. */
export const productAddons = (product: null | Pick<Product, 'addons' | 'type'>): ProductAddon[] => {
  if (!product || (product.type !== 'one-time' && product.type !== 'combo')) return []

  const seen = new Set<number>()
  const list: ProductAddon[] = []

  for (const entry of product.addons ?? []) {
    if (!entry || typeof entry !== 'object') continue
    const addon = entry as Addon
    const price = Number(addon.price)
    const title = typeof addon.title === 'string' ? addon.title.trim() : ''

    if (addon.available === false || !title || !Number.isSafeInteger(price) || price < 1) continue
    if (typeof addon.id !== 'number' || seen.has(addon.id)) continue

    seen.add(addon.id)
    list.push({ id: addon.id, note: addon.note?.trim() ?? '', price, title })
  }

  return list.slice(0, MAX_ADDONS)
}

/** Sorted, unique, positive whole ids, at most six; anything else is dropped. */
export const cleanAddonIds = (values: unknown[]): number[] =>
  [...new Set(values.map((value) => (typeof value === 'string' ? Number(value) : value)))]
    .filter((id): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id > 0)
    .sort((a, b) => a - b)
    .slice(0, MAX_ADDONS)

/**
 * The add-ons the ids name, in the product's order, or null when any id is not
 * offered on this product right now (detached, paused or never attached).
 */
export const pickAddons = (
  product: null | Pick<Product, 'addons' | 'type'>,
  ids: number[],
): null | ProductAddon[] => {
  if (ids.length === 0) return []

  const offered = productAddons(product)
  const wanted = new Set(ids)

  if (wanted.size !== ids.length || ids.some((id) => !offered.some((addon) => addon.id === id))) return null

  return offered.filter((addon) => wanted.has(addon.id))
}

/** "Almond milk, Toast", or null when there are none. */
export const addonsLabel = (addons?: null | { title?: null | string }[]): null | string => {
  const titles = (addons ?? []).map((addon) => addon.title?.trim()).filter(Boolean)
  return titles.length > 0 ? titles.join(', ') : null
}
