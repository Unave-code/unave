import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'

/**
 * The category pages, in a real browser (spec 0008).
 *
 * These tests run against the dev server and the dev database, and they seed
 * their own two products (one open, one paused) in the ready-to-cook category so
 * they never depend on what the kitchen has on the shelves today. The
 * fresh-from-produce category is assumed to have no e2e products; the kitchen's
 * real products live elsewhere. Everything cleans up after itself.
 *
 * The category slugs are reserved, so these fixture slugs are safe.
 */

const BASE = 'http://localhost:3000'

const OPEN_PRODUCT = {
  available: true,
  category: 'ready-to-cook' as const,
  description: undefined,
  durations: [{ days: 7, label: 'One week', price: 49900 }],
  slug: 'e2e-ready-to-cook-plan',
  title: 'Category E2E cook',
}
const PAUSED_PRODUCT = {
  available: false,
  category: 'ready-to-cook' as const,
  durations: [{ days: 7, label: 'One week', price: 29900 }],
  slug: 'e2e-ready-to-cook-paused',
  title: 'Category E2E paused',
}

let openId: number | string
let pausedId: number | string
let breakfastId: number | string
let dinnerId: number | string

const card = (page: Page, title: string) =>
  page.locator('article', { has: page.getByRole('heading', { name: title }) })

test.beforeAll(async () => {
  // Pulling the schema on a cold start can take longer than the default hook
  // budget, and this hook seeds the whole shelf.
  test.setTimeout(120_000)

  const payload = await getPayload({ config })

  for (const product of [OPEN_PRODUCT, PAUSED_PRODUCT]) {
    const existing = await payload.find({
      collection: 'products',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { slug: { equals: product.slug } },
    })
    if (existing.docs.length > 0) {
      await payload.delete({
        collection: 'products',
        context: { disableRevalidate: true },
        id: existing.docs[0].id,
        overrideAccess: true,
      })
    }
  }

  // Every product carries a required subcategory from its own category (spec
  // 0008, AC-9), so the fixtures create their option rows first.
  const breakfast = await payload.create({
    collection: 'subcategories',
    data: { category: 'ready-to-cook', title: 'Breakfast' },
    overrideAccess: true,
  })
  const dinner = await payload.create({
    collection: 'subcategories',
    data: { category: 'ready-to-cook', title: 'Dinner' },
    overrideAccess: true,
  })

  breakfastId = breakfast.id
  dinnerId = dinner.id

  const open = await payload.create({
    collection: 'products',
    // disableRevalidate: the revalidate hook needs the Next runtime, which the
    // test process is not; the fixtures are also deleted right after.
    context: { disableRevalidate: true },
    data: {
      ...OPEN_PRODUCT,
      audience: 'kids',
      points: [{ point: 'Prepped and ready' }],
      subcategory: breakfastId,
    },
    overrideAccess: true,
  })
  const paused = await payload.create({
    collection: 'products',
    context: { disableRevalidate: true },
    data: {
      ...PAUSED_PRODUCT,
      audience: 'adults',
      points: [{ point: 'Still on the list' }],
      subcategory: dinnerId,
    },
    overrideAccess: true,
  })

  openId = open.id
  pausedId = paused.id
})

test.afterAll(async () => {
  const payload = await getPayload({ config })

  for (const id of [openId, pausedId]) {
    try {
      await payload.delete({
        collection: 'products',
        context: { disableRevalidate: true },
        id,
        overrideAccess: true,
      })
    } catch {
      // Best effort cleanup.
    }
  }

  for (const id of [breakfastId, dinnerId]) {
    try {
      await payload.delete({ collection: 'subcategories', id, overrideAccess: true })
    } catch {
      // Best effort cleanup.
    }
  }
})

test.describe('a category page', () => {
  test('renders its own shelf, with paused products shown but not buyable (AC-1)', async ({ page }) => {
    await page.goto(`${BASE}/products/ready-to-cook`)

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/The chopping is done/i)
    await expect(page.getByRole('heading', { name: 'Category E2E cook' })).toBeVisible()
    // The card opens the product's own page and adds the shown duration itself.
    await expect(card(page, 'Category E2E cook').getByRole('link')).toHaveAttribute(
      'href',
      `/products/${OPEN_PRODUCT.slug}`,
    )
    await expect(card(page, 'Category E2E cook').getByRole('button', { name: 'Add to cart' })).toBeVisible()

    await expect(page.getByRole('heading', { name: 'Category E2E paused' })).toBeVisible()
    await expect(card(page, 'Category E2E paused').getByRole('button', { name: 'Add to cart' })).toHaveCount(0)
    await expect(page.getByText(/What "paused" means/i)).toBeVisible()
  })

  test('narrows by audience with icon pills, without leaving the page (AC-2)', async ({ page }) => {
    await page.goto(`${BASE}/products/ready-to-cook`)

    const group = page.getByRole('group', { name: 'Filter the products by audience' })
    await expect(group.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')

    // Each audience pill carries its code art, genuinely rendered rather than
    // an empty label.
    for (const name of ['All', 'Kids', 'Adults', 'Special']) {
      await expect(group.getByRole('button', { name }).locator('svg')).toHaveCount(1)
    }

    await group.getByRole('button', { name: 'Kids' }).click()
    await expect(card(page, 'Category E2E cook')).toBeVisible()
    await expect(card(page, 'Category E2E paused')).toHaveCount(0)
    await expect(page).toHaveURL(`${BASE}/products/ready-to-cook`)

    await group.getByRole('button', { name: 'Adults' }).click()
    await expect(card(page, 'Category E2E paused')).toBeVisible()
    await expect(card(page, 'Category E2E cook')).toHaveCount(0)

    await group.getByRole('button', { name: 'All' }).click()
    await expect(card(page, 'Category E2E cook')).toBeVisible()
    await expect(card(page, 'Category E2E paused')).toBeVisible()
  })

  test('works the same on a phone (AC-2)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 })
    await page.goto(`${BASE}/products/ready-to-cook`)

    const group = page.getByRole('group', { name: 'Filter the products by audience' })
    await group.getByRole('button', { name: 'Kids' }).click()
    await expect(card(page, 'Category E2E cook')).toBeVisible()
    await expect(card(page, 'Category E2E paused')).toHaveCount(0)
  })

  test('answers an empty category and an empty filter with words and WhatsApp (AC-3)', async ({ page }) => {
    await page.goto(`${BASE}/products/fresh-from-produce`)
    await expect(page.getByText('No products are open right now')).toBeVisible()
    await expect(page.locator('a[href*="wa.me"]').first()).toBeVisible()

    await page.goto(`${BASE}/products/ready-to-cook`)
    await page
      .getByRole('group', { name: 'Filter the products by audience' })
      .getByRole('button', { name: 'Special' })
      .click()
    await expect(page.getByText('Nothing under this filter')).toBeVisible()
    await expect(page.locator('a[href*="wa.me"]').first()).toBeVisible()
  })

  test('serves a product page for a product slug and refuses anything else (AC-4)', async ({ page }) => {
    const productPage = await page.goto(`${BASE}/products/${OPEN_PRODUCT.slug}`)
    expect(productPage?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name: OPEN_PRODUCT.title })).toBeVisible()

    const nonsense = await page.goto(`${BASE}/products/not-a-category`)
    expect(nonsense?.status()).toBe(404)
  })

  test('is reached from a product page, and links to the other shelves (AC-5)', async ({ page }) => {
    await page.goto(`${BASE}/products/${OPEN_PRODUCT.slug}`)
    const badge = page.getByRole('link', { name: 'Browse Ready to cook products' })
    await expect(badge).toBeVisible()
    await expect(badge).toHaveAttribute('href', '/products/ready-to-cook')

    await page.goto(`${BASE}/products/ready-to-cook`)
    await expect(page.locator('a[href="/products/ready-to-eat"]').first()).toBeVisible()
    await expect(page.locator('a[href="/products/fresh-from-produce"]').first()).toBeVisible()
  })

  test('carries its own title, canonical address and sitemap entries (AC-6)', async ({ page }) => {
    // The sitemap route compiles on its first request in dev, which once blew
    // the default 30 second test timeout on its own.
    test.setTimeout(90_000)

    await page.goto(`${BASE}/products/ready-to-cook`)
    await expect(page).toHaveTitle(/Ready to cook products/i)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/products\/ready-to-cook$/)

    const sitemap = await page.request.get(`${BASE}/pages-sitemap.xml`)
    const xml = await sitemap.text()
    for (const category of ['ready-to-cook', 'ready-to-eat', 'fresh-from-produce']) {
      expect(xml).toContain(`/products/${category}`)
    }
  })
})
