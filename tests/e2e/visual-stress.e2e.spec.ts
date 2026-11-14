import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'

/**
 * Launch polish stress cases (plan Review Focus 1, 2, 5 and audit B1): what real
 * CMS content and real phones do to the layout that the happy-path specs miss.
 */

const BASE = 'http://localhost:3000'
const run = `e2e-stress-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
const LONG_TITLE = 'Kerala avial cuts with drumstick, raw banana and yam, extra pack'
let productId: number | string | undefined

test.beforeAll(async () => {
  test.setTimeout(180_000)
  const payload = await getPayload({ config })
  const sub = await payload.find({
    collection: 'subcategories',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { and: [{ category: { equals: 'ready-to-cook' } }, { slug: { not_like: 'it-' } }] },
  })
  const created = await payload.create({
    collection: 'products',
    context: { disableRevalidate: true },
    data: {
      audience: 'adults',
      available: true,
      category: 'ready-to-cook',
      price: 9900,
      slug: run,
      subcategory: sub.docs[0]?.id,
      title: LONG_TITLE,
      type: 'one-time',
    } as never,
    overrideAccess: true,
  })
  productId = created.id
})

test.afterAll(async () => {
  test.setTimeout(120_000)
  if (productId === undefined) return
  const payload = await getPayload({ config })
  await payload
    .delete({ collection: 'products', context: { disableRevalidate: true }, id: productId, overrideAccess: true })
    .catch(() => {})
})

const cardFor = (page: Page, title: string) =>
  page.locator('article', { has: page.getByRole('heading', { name: title }) })

/** WCAG relative-luminance contrast between an element's text and the nearest opaque background. */
const contrastOf = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => {
    const parse = (c: string) => (c.match(/[\d.]+/g) ?? ['0', '0', '0', '0']).map(Number)
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    let bgEl: Element | null = el
    let bg = [255, 255, 255]
    while (bgEl) {
      const c = parse(getComputedStyle(bgEl).backgroundColor)
      if (c.length < 4 || c[3] > 0.95) {
        bg = c.slice(0, 3)
        break
      }
      bgEl = bgEl.parentElement
    }
    const fg = parse(getComputedStyle(el).color).slice(0, 3)
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x)
    return (a + 0.05) / (b + 0.05)
  })

test.describe('stress at 360px', () => {
  test.use({ viewport: { width: 360, height: 780 } })

  test('long product title and description do not overflow', async ({ page }) => {
    await page.goto(`${BASE}/products?q=${encodeURIComponent('drumstick')}`)
    const card = cardFor(page, LONG_TITLE)
    await expect(card).toBeVisible()

    const width = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
    expect(width[0]).toBeLessThanOrEqual(width[1])

    const cardBox = await card.boundingBox()
    const titleBox = await card.getByRole('heading', { name: LONG_TITLE }).boundingBox()
    expect(cardBox && titleBox).toBeTruthy()
    expect(titleBox!.y).toBeGreaterThanOrEqual(cardBox!.y)
    expect(titleBox!.y + titleBox!.height).toBeLessThanOrEqual(cardBox!.y + cardBox!.height)
  })

  test('missing product image shows placeholder', async ({ page }) => {
    await page.goto(`${BASE}/products?q=${encodeURIComponent('drumstick')}`)
    const card = cardFor(page, LONG_TITLE)
    await expect(card.getByTestId('product-image-placeholder')).toBeVisible()
    const box = await card.boundingBox()
    expect(box!.height).toBeGreaterThan(100)
  })

  test('footer stays readable when its photo never loads', async ({ page }) => {
    await page.route(/\.(jpg|jpeg|png|webp|avif)(\?|$)/, (route) => route.abort())
    await page.route(/\/_next\/image/, (route) => route.abort())
    await page.goto(`${BASE}/about`)
    const ratio = await contrastOf(page, 'footer nav a')
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  test('reduced motion disables gallery autoplay and header transition', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 360, height: 780 } })
    const page = await context.newPage()
    await page.goto(`${BASE}/`)
    const current = page.locator('[data-hero-slide]:not([aria-hidden="true"])').first()
    const before = await current.getAttribute('aria-label')
    await page.waitForTimeout(6_500)
    expect(await page.locator('[data-hero-slide]:not([aria-hidden="true"])').first().getAttribute('aria-label')).toBe(before)
    await context.close()
  })
})
