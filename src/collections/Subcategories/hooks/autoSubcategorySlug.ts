import type { FieldHook, Payload, Where } from 'payload'

import { slugifyTitle } from '../../Products/hooks/autoProductSlug'

export type SubcategorySlugSource = {
  id: number
  slug?: null | string
  title: string
}

export const slugifySubcategoryTitle = (title: string): string =>
  slugifyTitle(title) || 'subcategory'

export const assignUniqueSubcategorySlugs = (subcategories: readonly SubcategorySlugSource[]) => {
  const assigned = new Set<string>()

  return [...subcategories]
    .sort((a, b) => a.id - b.id)
    .map(({ id, slug, title }) => {
      const base = slugifySubcategoryTitle(slug || title)
      let next = base

      for (let suffix = 2; assigned.has(next); suffix++) {
        next = `${base}-${suffix}`
      }

      assigned.add(next)

      return { id, previousSlug: slug, slug: next }
    })
}

export const firstFreeSubcategorySlug = async (
  payload: Payload,
  base: string,
  selfId?: number | string,
): Promise<string> => {
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`

    const where: Where =
      selfId === undefined
        ? { slug: { equals: candidate } }
        : { and: [{ slug: { equals: candidate } }, { id: { not_equals: selfId } }] }

    const clashes = await payload.find({
      collection: 'subcategories',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where,
    })

    if (clashes.docs.length === 0) return candidate
  }
}

export const autoSubcategorySlug: FieldHook = ({ data, operation, originalDoc, req, value }) => {
  if (typeof value === 'string') {
    const typed = slugifyTitle(value)

    if (typed.length > 0) return typed
  }

  const source = (data as { title?: unknown } | undefined)?.title
  const previous = (originalDoc as { title?: unknown } | undefined)?.title
  const title = typeof source === 'string' ? source : typeof previous === 'string' ? previous : ''
  const base = slugifySubcategoryTitle(title)
  const selfId =
    operation === 'update' ? (originalDoc as { id?: number | string } | undefined)?.id : undefined

  return firstFreeSubcategorySlug(req.payload, base, selfId)
}
