/**
 * @vitest-environment node
 */
import type { Payload, PayloadRequest, Where } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import {
  assignUniqueSubcategorySlugs,
  autoSubcategorySlug,
  firstFreeSubcategorySlug,
  slugifySubcategoryTitle,
} from '@/collections/Subcategories/hooks/autoSubcategorySlug'
import { Subcategories } from '@/collections/Subcategories'

const slugField = Subcategories.fields.find((field) => 'name' in field && field.name === 'slug')

const payloadWithSlugs = (taken: Set<string>) => {
  const find = vi.fn(async ({ where }: { where: Where }) => {
    const slug = JSON.stringify(where).match(/"equals":"([^"]+)"/)?.[1]

    if (!slug) throw new Error('Expected a slug lookup')

    return { docs: taken.has(slug) ? [{ id: 1 }] : [] }
  })

  return { find, payload: { find } as unknown as Payload }
}

const hookArgs = (
  payload: Payload,
  title: string,
  value: string,
): Parameters<typeof autoSubcategorySlug>[0] => {
  if (!slugField) throw new Error('Subcategory slug field must exist')

  return {
    blockData: undefined,
    collection: null,
    context: {},
    data: { title },
    field: slugField,
    global: null,
    indexPath: [],
    operation: 'create',
    path: ['slug'],
    req: { payload } as PayloadRequest,
    schemaPath: ['slug'],
    siblingData: { title },
    siblingFields: [],
    value,
  } as Parameters<typeof autoSubcategorySlug>[0]
}

describe('subcategory slug generation', () => {
  it('normalizes titles and falls back when nothing remains', () => {
    expect(slugifySubcategoryTitle('Café Thali')).toBe('cafe-thali')
    expect(slugifySubcategoryTitle('🍲')).toBe('subcategory')
  })

  it('keeps the Media image field optional', () => {
    const imageField = Subcategories.fields.find(
      (field) => 'name' in field && field.name === 'image',
    )

    if (!imageField || !('type' in imageField) || imageField.type !== 'upload') {
      throw new Error('Subcategory image field must be an upload')
    }

    expect(imageField.relationTo).toBe('media')
    expect(imageField.required).not.toBe(true)
  })

  it('uses the first free numeric suffix across the collection', async () => {
    const { payload } = payloadWithSlugs(new Set(['breakfast', 'breakfast-2']))

    await expect(firstFreeSubcategorySlug(payload, 'breakfast')).resolves.toBe('breakfast-3')
  })

  it('connects the slug field to the title generator', async () => {
    if (!slugField || !('hooks' in slugField) || !slugField.hooks) {
      throw new Error('Subcategory slug field must have a validation hook')
    }

    expect(slugField.hooks.beforeValidate).toContain(autoSubcategorySlug)
  })

  it('assigns stable unique slugs in ID order when backfilling existing rows', () => {
    expect(
      assignUniqueSubcategorySlugs([
        { id: 45, slug: null, title: 'Greens' },
        { id: 12, slug: null, title: 'Greens' },
      ]),
    ).toEqual([
      { id: 12, previousSlug: null, slug: 'greens' },
      { id: 45, previousSlug: null, slug: 'greens-2' },
    ])
  })

  it('requires a unique slug for public subcategory filters', () => {
    expect(slugField && 'required' in slugField && slugField.required).toBe(true)
    expect(slugField && 'unique' in slugField && slugField.unique).toBe(true)
  })

  it('generates a slug through the field hook and suffixes collisions', async () => {
    const { payload } = payloadWithSlugs(new Set(['cafe-thali']))
    const slug = await autoSubcategorySlug(hookArgs(payload, 'Café Thali', ''))

    expect(slug).toBe('cafe-thali-2')
  })

  it('normalizes a usable slug entered by staff', async () => {
    const { find, payload } = payloadWithSlugs(new Set())
    const slug = await autoSubcategorySlug(hookArgs(payload, 'Breakfast', '  My New Slug  '))

    expect(slug).toBe('my-new-slug')
    expect(find).not.toHaveBeenCalled()
  })

  it('keeps the existing slug when staff change the title', async () => {
    const { find, payload } = payloadWithSlugs(new Set())
    const args = hookArgs(payload, 'Renamed title', 'original-slug')
    const slug = await autoSubcategorySlug({
      ...args,
      operation: 'update',
      originalDoc: { id: 1, title: 'Original title' },
    })

    expect(slug).toBe('original-slug')
    expect(find).not.toHaveBeenCalled()
  })
})
