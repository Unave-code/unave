/**
 * @vitest-environment node
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'
import type { Product, User } from '@/payload-types'

// The dev database is remote, so a single test can make several slow round trips.
vi.setConfig({ hookTimeout: 120_000, testTimeout: 60_000 })

/**
 * Building a combo in the admin (spec 0010, AC-1, AC-2 and AC-9).
 *
 * A combo is a product with two to ten distinct products inside it. The
 * collection refuses a duplicate, a combo inside a combo, a meal plan without
 * one current duration and a price with more than two decimal places.
 */

let payload: Payload

const run = `it-combo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const productIDs: (number | string)[] = []
const subcategoryIDs: (number | string)[] = []
let staff: User
let planId: number
let oneTimeId: number
let subcategoryId: number

const staffOptions = () => ({ context: { disableRevalidate: true }, user: staff })

type ValidationIssue = { message?: string }

/**
 * Payload's top level message only names the invalid fields. The sentence the
 * field validation wrote lives in `error.data.errors`, so read both.
 */
const failure = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise
  } catch (error) {
    const issues = (error as { data?: { errors?: ValidationIssue[] } }).data?.errors ?? []

    return [error instanceof Error ? error.message : String(error), ...issues.map((issue) => issue.message ?? '')]
      .filter(Boolean)
      .join(' | ')
  }

  throw new Error('Expected the save to fail, but it succeeded.')
}

const comboData = (
  components: NonNullable<Product['components']>,
  overrides: Record<string, unknown> = {},
) => ({
  audience: 'adults' as const,
  category: 'ready-to-eat' as const,
  components,
  price: 99000,
  slug: `${run}-${Math.random().toString(36).slice(2, 8)}`,
  subcategory: subcategoryId as number,
  title: 'Family combo',
  type: 'combo' as const,
  ...overrides,
})

beforeAll(async () => {
  payload = await getPayload({ config })

  const subcategory = await payload.create({
    collection: 'subcategories',
    context: { disableRevalidate: true },
    data: { category: 'ready-to-eat', slug: '', title: `${run} tiffin` },
    overrideAccess: true,
  })
  subcategoryId = subcategory.id
  subcategoryIDs.push(subcategory.id)

  staff = (await payload.create({
    collection: 'users',
    data: {
      email: `${run}@unave.test`,
      name: 'Combo Staff',
      password: 'correct-horse-battery',
      role: 'admin',
    },
    overrideAccess: true,
  })) as User

  const plan = (await payload.create({
    collection: 'products',
    data: {
      audience: 'adults',
      available: true,
      category: 'ready-to-eat',
      durations: [{ days: 5, label: 'One week', price: 150000 }],
      slug: `${run}-plan`,
      subcategory: subcategoryId as number,
      title: 'Lunch plan',
      type: 'plan',
    },
    depth: 0,
    context: { disableRevalidate: true },
    overrideAccess: true,
  })) as Product
  planId = plan.id
  productIDs.push(plan.id)

  const oneTime = (await payload.create({
    collection: 'products',
    data: {
      audience: 'adults',
      available: true,
      category: 'ready-to-eat',
      price: 4900,
      slug: `${run}-box`,
      subcategory: subcategoryId as number,
      title: 'Phulka box',
      type: 'one-time',
    },
    depth: 0,
    context: { disableRevalidate: true },
    overrideAccess: true,
  })) as Product
  oneTimeId = oneTime.id
  productIDs.push(oneTime.id)
})

afterAll(async () => {
  for (const id of productIDs) {
    try {
      await payload.delete({
        collection: 'products',
        context: { disableRevalidate: true },
        id,
        overrideAccess: true,
        user: staff,
      })
    } catch {
      // Best effort cleanup.
    }
  }

  for (const id of subcategoryIDs) {
    try {
      await payload.delete({
        collection: 'subcategories',
        context: { disableRevalidate: true },
        id,
        overrideAccess: true,
      })
    } catch {
      // Best effort cleanup.
    }
  }

  try {
    await payload.delete({ collection: 'users', id: staff.id, overrideAccess: true })
  } catch {
    // Best effort cleanup.
  }
})

describe('saving a combo', () => {
  it('accepts two distinct products and freezes their titles and duration', async () => {
    const created = (await payload.create({
      collection: 'products',
      data: comboData([{ product: oneTimeId }, { durationLabel: 'one week', product: planId }]),
      depth: 0,
      ...staffOptions(),
    })) as Product

    productIDs.push(created.id)

    expect(created.type).toBe('combo')
    expect(created.components).toHaveLength(2)
    expect(created.components?.[0]?.productTitleSnapshot).toBe('Phulka box')
    expect(created.components?.[1]?.productTitleSnapshot).toBe('Lunch plan')
    expect(created.components?.[1]?.durationLabel).toBe('One week')
    expect(created.components?.[1]?.durationDaysSnapshot).toBe(5)
    expect(created.durations).toHaveLength(0)
  })

  it('refuses the same product twice', async () => {
    const message = await failure(
      payload.create({
        collection: 'products',
        data: comboData([{ product: oneTimeId }, { product: oneTimeId }]),
        depth: 0,
        ...staffOptions(),
      }),
    )

    expect(message).toMatch(/only once/i)
  })

  it('refuses fewer than two products', async () => {
    const message = await failure(
      payload.create({
        collection: 'products',
        data: comboData([{ product: oneTimeId }]),
        depth: 0,
        ...staffOptions(),
      }),
    )

    expect(message).toMatch(/between two and ten/i)
  })

  it('refuses a meal plan without a current duration', async () => {
    const message = await failure(
      payload.create({
        collection: 'products',
        data: comboData([{ product: oneTimeId }, { product: planId }]),
        depth: 0,
        ...staffOptions(),
      }),
    )

    expect(message).toMatch(/duration/i)
  })

  it('refuses a duration the plan no longer has', async () => {
    const message = await failure(
      payload.create({
        collection: 'products',
        data: comboData([{ product: oneTimeId }, { durationLabel: 'Two weeks', product: planId }]),
        depth: 0,
        ...staffOptions(),
      }),
    )

    expect(message).toMatch(/duration/i)
  })

  it('refuses a combo inside a combo', async () => {
    const inner = (await payload.create({
      collection: 'products',
      data: comboData([{ product: oneTimeId }, { durationLabel: 'One week', product: planId }]),
      depth: 0,
      ...staffOptions(),
    })) as Product

    productIDs.push(inner.id)

    const message = await failure(
      payload.create({
        collection: 'products',
        data: comboData([{ product: inner.id }, { product: oneTimeId }]),
        depth: 0,
        ...staffOptions(),
      }),
    )

    expect(message).toMatch(/existing one-time product or meal plan/i)
  })

  it('refuses a price with more than two decimal places', async () => {
    const message = await failure(
      payload.create({
        collection: 'products',
        data: comboData([{ product: oneTimeId }, { durationLabel: 'One week', product: planId }], {
          price: 99000.5,
        }),
        depth: 0,
        ...staffOptions(),
      }),
    )

    expect(message).toMatch(/two decimal places/i)
  })

  it('keeps a customer from writing a product', async () => {
    const customer = await payload.create({
      collection: 'customers',
      data: {
        email: `${run}-${Math.random().toString(36).slice(2, 8)}@unave.test`,
        name: 'Test Customer',
        password: 'correct-horse-battery',
      },
      depth: 0,
      disableVerificationEmail: true,
      overrideAccess: true,
    })

    try {
      await expect(
        payload.create({
          collection: 'products',
          data: comboData([{ product: oneTimeId }, { durationLabel: 'One week', product: planId }]),
          depth: 0,
          overrideAccess: false,
          user: customer,
        }),
      ).rejects.toThrow()
    } finally {
      await payload.delete({ collection: 'customers', id: customer.id, overrideAccess: true })
    }
  })
})
