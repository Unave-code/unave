/**
 * @vitest-environment node
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { slugifyTitle } from '@/collections/Products/hooks/autoProductSlug'
import config from '@/payload.config'
import type { Product, Subcategory } from '@/payload-types'

// The dev database is remote, so a single test can make several slow round trips,
// and the first `getPayload` in a worker pulls the schema from it.
vi.setConfig({ hookTimeout: 120_000, testTimeout: 60_000 })

/**
 * The slug that fills itself from the title (design.md §6.15's address rule
 * with the typing taken out).
 *
 * A product saved without a slug — what every admin save now leaves behind —
 * gets the title, slugified, kept unique against the whole collection and away
 * from the three reserved category slugs by suffixing rather than erroring. A
 * slug typed on purpose is a slug kept. These tests go through the real
 * collection config against the dev database, so the hook, the required check
 * and the unique index all stand in the same save a staff member makes.
 */

let payload: Payload

const run = `it-slug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const productIDs: (number | string)[] = []
let subcategoryId: number | string

/**
 * A product the way an admin save that never typed a slug produces: the field
 * is simply absent from the write. Payload's create types cannot say "required
 * but about to be filled by a hook", so the absence is asserted here.
 */
const createProductWithoutSlug = async (title: string): Promise<Product> => {
  const data = {
    audience: 'adults' as const,
    category: 'ready-to-eat' as const,
    durations: [{ days: 5, label: 'One week', price: 150000 }],
    subcategory: subcategoryId as number,
    title,
    type: 'plan' as const,
  }

  const created = (await payload.create({
    collection: 'products',
    data: data as typeof data & { slug: string },
    depth: 0,
    // The revalidateProducts hook calls Next's revalidateTag, which only exists
    // inside the Next runtime this spec does not run in.
    context: { disableRevalidate: true },
    overrideAccess: true,
  })) as Product

  productIDs.push(created.id)
  return created
}

const createProduct = async (data: { slug: string; title: string }): Promise<Product> => {
  const created = (await payload.create({
    collection: 'products',
    data: {
      audience: 'adults',
      category: 'ready-to-eat',
      durations: [{ days: 5, label: 'One week', price: 150000 }],
      slug: data.slug,
      subcategory: subcategoryId as number,
      title: data.title,
      type: 'plan' as const,
    },
    depth: 0,
    // The revalidateProducts hook calls Next's revalidateTag, which only exists
    // inside the Next runtime this spec does not run in.
    context: { disableRevalidate: true },
    overrideAccess: true,
  })) as Product

  productIDs.push(created.id)
  return created
}

describe('slugifyTitle', () => {
  it('lowercases and dashes a plain title', () => {
    expect(slugifyTitle('Lunch Plan')).toBe('lunch-plan')
  })

  it('collapses runs of noise into one dash and trims the ends', () => {
    expect(slugifyTitle('  Aashirvaad   Special & Lite! ')).toBe('aashirvaad-special-lite')
  })

  it('folds accents but keeps the letters', () => {
    expect(slugifyTitle('Café Thali')).toBe('cafe-thali')
  })

  it('leaves nothing behind for a title with no latin letters or digits', () => {
    expect(slugifyTitle('अभी खाएं')).toBe('')
  })
})

describe('a product saved without a slug', () => {
  it('takes the slugified title', async () => {
    const created = await createProductWithoutSlug(`${run} lunch plan`)

    expect(created.slug).toBe(`${run}-lunch-plan`)
  })

  it('takes a suffix when the slugified title is already taken', async () => {
    const first = await createProductWithoutSlug(`${run} thali`)
    const second = await createProductWithoutSlug(`${run} thali`)

    expect(first.slug).toBe(`${run}-thali`)
    expect(second.slug).toBe(`${run}-thali-2`)
  })

  it('skips the reserved category slugs the way a typed slug must', async () => {
    const created = await createProductWithoutSlug('Ready to cook')

    // "ready-to-cook" is one of the three category pages, so the plain slug is
    // not offered and the save gains a suffix instead of an error.
    expect(created.slug).toBe('ready-to-cook-2')
  })
})

describe('a slug typed on purpose', () => {
  it('is kept when it is already a clean address', async () => {
    const created = await createProduct({ slug: `${run}-pinned`, title: `${run} pinned plan` })

    expect(created.slug).toBe(`${run}-pinned`)
  })

  it('is trimmed, lowercased and dashed into an address', async () => {
    const created = await createProduct({
      slug: `  ${run.toUpperCase()} Trailing `,
      title: `${run} padded plan`,
    })

    expect(created.slug).toBe(`${run}-trailing`)
  })
})

describe('updates', () => {
  it('keep the address the admin form sends back', async () => {
    const created = await createProductWithoutSlug(`${run} steady plan`)

    const updated = (await payload.update({
      collection: 'products',
      data: { title: `${run} steady plan, renamed` },
      id: created.id,
      depth: 0,
      context: { disableRevalidate: true },
      overrideAccess: true,
    })) as Product

    expect(updated.slug).toBe(`${run}-steady-plan`)
  })

  it('fill the slug again from the new title when it arrives empty', async () => {
    const created = await createProductWithoutSlug(`${run} refill plan`)

    const updated = (await payload.update({
      collection: 'products',
      data: { slug: '', title: `${run} refill plan, moved` },
      id: created.id,
      depth: 0,
      context: { disableRevalidate: true },
      overrideAccess: true,
    })) as Product

    expect(updated.slug).toBe(`${run}-refill-plan-moved`)
  })
})

beforeAll(async () => {
  payload = await getPayload({ config })

  const subcategory = await payload.create({
    collection: 'subcategories',
    data: { category: 'ready-to-eat', title: `${run} tiffin` },
    overrideAccess: true,
  })

  subcategoryId = subcategory.id
})

afterAll(async () => {
  for (const id of productIDs) {
    try {
      await payload.delete({
        collection: 'products',
        id,
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
    } catch {
      // Best effort cleanup.
    }
  }

  try {
    await payload.delete({ collection: 'subcategories', id: subcategoryId, overrideAccess: true })
  } catch {
    // Best effort cleanup.
  }
})
