import type { FieldHook, Payload } from 'payload'
import type { Where } from 'payload'

import { PRODUCT_CATEGORY_VALUES } from '../../../utilities/productsCategoryCopy'

/**
 * A title becomes a slug: lowercase, every run of characters that is not a
 * letter or a digit becomes one dash, and dashes at the ends go away. Accents
 * fold along the way ("Café" becomes "cafe"); a title that leaves nothing
 * after the fold falls back to `product` and takes a suffix from there, so the
 * save never dies on a required field the kitchen was never asked to type.
 */
export const slugifyTitle = (input: string): string =>
  input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * The first slug nobody else holds. The plain slug is tried first unless the
 * reserved rule owns it — spec 0008, AC-7: a product slug can never be a
 * category slug, because /products/<category> is a category page — and after
 * that the suffixes -2, -3 walk upward. The document being saved is left out
 * of the search, so an update that emptied its own slug does not find itself.
 */
export const firstFreeSlug = async (
  payload: Payload,
  base: string,
  selfId?: number | string,
): Promise<string> => {
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`

    if (n === 1 && (PRODUCT_CATEGORY_VALUES as readonly string[]).includes(candidate)) {
      continue
    }

    const where: Where =
      selfId === undefined
        ? { slug: { equals: candidate } }
        : { and: [{ slug: { equals: candidate } }, { id: { not_equals: selfId } }] }

    const clashes = await payload.find({
      collection: 'products',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where,
    })

    if (clashes.docs.length === 0) return candidate
  }
}

/**
 * The slug fills itself from the title, so the kitchen never has to invent one.
 *
 * An empty slug — the shape every admin save leaves it in — is replaced on
 * create and on update alike: the title is slugified, a slug already taken by
 * another product gains a suffix, and a slug the reserved rule owns is skipped
 * the same way. A slug that arrives with a value is a slug typed on purpose
 * and is kept: the field stays editable for the rare address the kitchen wants
 * to pin, and the field's own validate still guards the reserved category
 * slugs. Because the hook runs before validation, `required: true` remains the
 * server-side guarantee — the hook simply never lets the value reach it empty.
 */
export const autoProductSlug: FieldHook = ({ data, operation, originalDoc, req, value }) => {
  if (typeof value === 'string' && value.trim().length > 0) return value

  const source = (data as { title?: unknown } | undefined)?.title
  const previous = (originalDoc as { title?: unknown } | undefined)?.title
  const title = typeof source === 'string' ? source : typeof previous === 'string' ? previous : ''

  const base = slugifyTitle(title) || 'product'

  const selfId =
    operation === 'update'
      ? (originalDoc as { id?: number | string } | undefined)?.id
      : undefined

  return firstFreeSlug(req.payload, base, selfId)
}
