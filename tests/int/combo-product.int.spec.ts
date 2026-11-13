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
 * one current duration and a price with more than two decimal places. Every
 * accepted save leaves an append only audit record with the actor, the action
 * and the before and after snapshots, and a failed audit write fails the save.
 */

let payload: Payload

const run = `it-combo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const productIDs: (number | string)[] = []
const auditIDs: (number | string)[] = []
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

const findAudits = async (comboId: number | string) => {
  const found = await payload.find({
    collection: 'combo-audit-logs',
    depth: 0,
    limit: 10,
    overrideAccess: true,
    sort: 'createdAt',
    where: { combo: { equals: comboId } },
  })

  return found.docs
}

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

  for (const id of auditIDs) {
    try {
      await payload.delete({ collection: 'combo-audit-logs', id, overrideAccess: true })
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

    const audits = await findAudits(created.id)
    auditIDs.push(...audits.map((audit) => audit.id))

    expect(audits).toHaveLength(1)
    expect(audits[0]?.action).toBe('created')
    expect(String(audits[0]?.actor)).toBe(String(staff.id))
    expect(audits[0]?.after).toMatchObject({ price: 99000, slug: created.slug, title: 'Family combo' })
    expect((audits[0]?.after as { components?: unknown[] } | null)?.components).toHaveLength(2)
    expect(audits[0]?.before).toBeNull()
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

  it('records an edit with the before and after snapshots, and a delete', async () => {
    const created = (await payload.create({
      collection: 'products',
      data: comboData([{ product: oneTimeId }, { durationLabel: 'One week', product: planId }]),
      depth: 0,
      ...staffOptions(),
    })) as Product

    const updated = (await payload.update({
      collection: 'products',
      data: { available: false, price: 88000 },
      depth: 0,
      id: created.id,
      ...staffOptions(),
    })) as Product

    expect(updated.available).toBe(false)

    const beforeDelete = await findAudits(created.id)
    auditIDs.push(...beforeDelete.map((audit) => audit.id))

    await payload.delete({
      collection: 'products',
      context: { disableRevalidate: true },
      id: created.id,
      overrideAccess: true,
      user: staff,
    })

    // The deleted combo's row is gone, so its audit record keeps the snapshots
    // but no combo reference. Read the newest delete record for this actor.
    const deletedAudit = await payload.find({
      collection: 'combo-audit-logs',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      sort: '-createdAt',
      where: {
        action: { equals: 'deleted' },
        actor: { equals: staff.id },
      },
    })

    const audits = [...beforeDelete, ...deletedAudit.docs]
    auditIDs.push(...deletedAudit.docs.map((audit) => audit.id))

    expect(audits.map((audit) => audit.action)).toEqual(['created', 'updated', 'deleted'])
    expect(audits[1]?.before).toMatchObject({ available: true, price: 99000 })
    expect(audits[1]?.after).toMatchObject({ available: false, price: 88000 })
    expect(audits[2]?.after).toBeNull()
    expect(audits[2]?.before).toMatchObject({ price: 88000 })
  })

  it('keeps a customer out of the audit log and out of writing a product', async () => {
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

      await expect(
        payload.find({
          collection: 'combo-audit-logs',
          limit: 1,
          overrideAccess: false,
          user: customer,
        }),
      ).rejects.toThrow()
    } finally {
      await payload.delete({ collection: 'customers', id: customer.id, overrideAccess: true })
    }
  })
})
