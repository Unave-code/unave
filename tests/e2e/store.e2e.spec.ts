import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'

/**
 * The store, in a real browser (spec 0007).
 *
 * These tests run against the dev server and the dev database. They create one
 * verified customer with a password and clean up after themselves. The
 * Razorpay keys are deliberately absent, so the pay step is exercised right up
 * to the gateway and answers with the plain configuration sentence the spec
 * asks for, which is exactly what an unconfigured deployment shows.
 *
 * The basket is the whole flow now: a card adds its shown line, the product's
 * own page adds any chosen duration, the cart page lists it all at live prices,
 * checkout pays for the whole basket, and the direct Buy now link is gone.
 */

const BASE = 'http://localhost:3000'
const PASSWORD = 'correct-horse-battery'
const CART_COOKIE = 'unave-cart'

let customerEmail: string
let customerId: number | string

const EMAIL_PREFIX = `e2e-store-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const signIn = async (page: Page) => {
  await page.fill('#signin-email', customerEmail)
  await page.fill('#signin-password', PASSWORD)
  await page.getByRole('button', { name: /Sign in/i }).click()
}

const cardFor = (page: Page, title: string) =>
  page.locator('article', { has: page.getByRole('heading', { name: title }) })

const addLine = async (page: Page, title = 'Lunch plan', duration = /^One month/) => {
  await page.goto(`${BASE}/products`)

  const before = (await cartCookie(page)).length

  // The card is a door now: open the product's own page, where the durations
  // and the cart live, then add the chosen one.
  await cardFor(page, title).getByRole('link').first().click()
  await page.getByText(duration).click({ force: true })
  await page.getByRole('button', { name: 'Add to cart' }).click({ force: true })

  // The add writes the cookie through a fetch or a form post, and the test may
  // navigate on before either has landed, so wait for the line to be recorded.
  await expect.poll(() => cartCookie(page), { timeout: 15_000 }).toHaveLength(before + 1)
}

const cartCookie = async (page: Page) => {
  const cookies = await page.context().cookies(BASE)
  const cookie = cookies.find((entry) => entry.name === CART_COOKIE)

  return cookie ? JSON.parse(decodeURIComponent(cookie.value)) : []
}

test.beforeAll(async () => {
  // The remote dev database is slow under load; the default 30 second hook
  // timeout failed before the customer existed (seen once on the rerun).
  test.setTimeout(120_000)

  const payload = await getPayload({ config })

  customerEmail = `${EMAIL_PREFIX}@unave.test`

  const existing = await payload.find({
    collection: 'customers',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: customerEmail } },
  })

  if (existing.docs.length > 0) {
    await payload.delete({ collection: 'customers', id: existing.docs[0].id, overrideAccess: true })
  }

  const created = await payload.create({
    collection: 'customers',
    data: {
      email: customerEmail,
      name: 'E2E Customer',
      password: PASSWORD,
    },
    depth: 0,
    disableVerificationEmail: true,
    overrideAccess: true,
  })

  customerId = created.id

  await payload.db.updateOne({
    collection: 'customers',
    data: { _verificationToken: null, _verified: true },
    id: created.id as number,
  })
})

test.afterAll(async () => {
  test.setTimeout(120_000)

  const payload = await getPayload({ config })

  try {
    await payload.delete({ collection: 'customers', id: customerId, overrideAccess: true })
  } catch {
    // Best effort cleanup.
  }
})

test.describe('the products shelf', () => {
  test('a signed out visitor can browse products and fill a cart', async ({ page }) => {
    await page.goto(`${BASE}/products`)

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Plan your week/i)

    // The seeded products render with durations and prices.
    await expect(page.getByRole('heading', { name: 'Lunch plan' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Kids plan' })).toBeVisible()

    // Browsing needs no account anywhere on the page.
    await expect(page.getByText(/No account needed to look around/i)).toBeVisible()

    // The card shows the cheapest per-day rate and adds the kitchen's default
    // duration; the product's own page carries every duration.
    const card = cardFor(page, 'Lunch plan')
    await expect(card.getByRole('link')).toHaveAttribute('href', /\/products\/.+/)
    await expect(card.getByRole('button', { name: 'Add to cart' })).toBeVisible()
    await expect(card.getByRole('button', { name: 'Buy now' })).toHaveCount(0)
  })
})

test.describe('the cart', () => {
  test('adds a line from the product page and lists it in the cart', async ({ page }) => {
    await addLine(page)

    // With JavaScript the add stays on the product's page.
    await expect(page).toHaveURL(/\/products\/[^/]+$/)
    await expect(page.getByText('Added to your cart.')).toBeVisible()
    await expect.poll(() => cartCookie(page)).toHaveLength(1)

    await page.goto(`${BASE}/cart`)

    await expect(page.getByRole('heading', { level: 1, name: 'Your cart' })).toBeVisible()
    await expect(page.getByText('Lunch plan', { exact: true })).toBeVisible()
    await expect(page.getByText(/One month, 22 days/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Go to checkout' })).toBeVisible()
  })

  test('refuses the same product and duration twice, in words', async ({ page }) => {
    await addLine(page)
    await expect(page.getByText('Added to your cart.')).toBeVisible()

    // Same product and duration, added again from the same page.
    await page.getByRole('button', { name: 'Add to cart' }).click()

    await expect(page.getByText('That product and duration is already in your cart.')).toBeVisible()
    expect(await cartCookie(page)).toHaveLength(1)
  })

  test('shows the whole basket and removes a line', async ({ page }) => {
    await addLine(page, 'Lunch plan', /^One week/)
    await addLine(page, 'Kids plan', /^One week/)

    await page.goto(`${BASE}/cart`)

    await expect(page.getByText('Lunch plan', { exact: true })).toBeVisible()
    await expect(page.getByText('Kids plan', { exact: true })).toBeVisible()

    const line = page.locator('li', { has: page.getByText('Kids plan', { exact: true }) })

    await line.getByRole('button', { name: /Remove/ }).click()

    await expect(page.getByText('Kids plan', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Lunch plan', { exact: true })).toBeVisible()
  })

  test('a stale line is marked, kept out of the total, and blocks checkout', async ({ page }) => {
    await page.context().addCookies([
      {
        name: CART_COOKIE,
        url: BASE,
        value: encodeURIComponent(
          JSON.stringify([{ duration: 'One week', product: 'not-a-plan-any-more' }]),
        ),
      },
    ])

    await page.goto(`${BASE}/cart`)

    await expect(page.getByText('No longer available')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Go to checkout' })).toHaveCount(0)
  })
})

test.describe('the cart without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('adds and removes lines with plain form posts', async ({ page }) => {
    await addLine(page)

    // The post redirects back to the product page; the cookie still carries the line.
    await expect(page).toHaveURL(/\/products\/[^/]+$/)
    await expect.poll(() => cartCookie(page)).toHaveLength(1)

    await page.goto(`${BASE}/cart`)
    await expect(page.getByText('Lunch plan', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: /Remove/ }).click()

    await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible()
    await expect(page.getByText(/Add a product and a duration from the products page/)).toBeVisible()
  })
})

test.describe('checkout', () => {
  test('carries the basket through sign in and shows every line', async ({ page }) => {
    await addLine(page)

    await page.goto(`${BASE}/cart`)
    await page.getByRole('link', { name: 'Go to checkout' }).click()

    // Signed out, the guard sends the buyer to sign in and keeps the address.
    await expect(page).toHaveURL(/\/sign-in\?.*return=%2Fcheckout/)
    await signIn(page)

    await expect(page).toHaveURL(`${BASE}/checkout`)
    await expect(page.getByRole('heading', { level: 1, name: 'Check out' })).toBeVisible()
    await expect(page.getByText('Lunch plan', { exact: true })).toBeVisible()
    await expect(page.getByText(/One month, 22 days/)).toBeVisible()
    await expect(page.getByText('To pay')).toBeVisible()
  })

  test('an empty cart is refused in words, not shown as a form', async ({ page }) => {
    await page.goto(`${BASE}/sign-in`)
    await signIn(page)
    await expect(page).toHaveURL(/\/account$/)

    await page.goto(`${BASE}/checkout`)

    await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible()
    await expect(page.getByText(/There is nothing to pay for yet/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pay for the order' })).toHaveCount(0)
    // Scoped to main: the header no longer carries a products pill.
    await expect(page.getByRole('main').getByRole('link', { name: 'Browse the products' })).toBeVisible()
  })

  test('a stale line stops payment with one sentence and a way to the cart', async ({ page }) => {
    await page.context().addCookies([
      {
        name: CART_COOKIE,
        url: BASE,
        value: encodeURIComponent(
          JSON.stringify([{ duration: 'One week', product: 'not-a-plan-any-more' }]),
        ),
      },
    ])

    await page.goto(`${BASE}/sign-in`)
    await signIn(page)
    await expect(page).toHaveURL(/\/account$/)

    await page.goto(`${BASE}/checkout`)

    await expect(page.getByRole('heading', { name: 'One line needs a change' })).toBeVisible()
    await expect(page.getByText(/has changed or left the menu/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Review your cart' })).toBeVisible()
  })

  test('paying without a configured gateway answers one plain sentence', async ({ page }) => {
    await addLine(page, 'Lunch plan', /^One week/)

    await page.goto(`${BASE}/cart`)
    await page.getByRole('link', { name: 'Go to checkout' }).click()

    await signIn(page)
    await expect(page).toHaveURL(`${BASE}/checkout`)

    // The profile is empty for this fresh customer, so fill the form.
    await page.fill('#checkout-name', 'E2E Customer')
    await page.fill('#checkout-phone', '9876543210')
    await page.fill('#checkout-line1', '12 Test Road')
    await page.fill('#checkout-city', 'Pune')
    await page.fill('#checkout-state', 'Maharashtra')
    await page.fill('#checkout-pincode', '411001')

    await page.getByRole('button', { name: 'Pay for the order' }).click()

    await expect(page.getByText(/Online payment is not set up yet/i)).toBeVisible({
      timeout: 20_000,
    })
  })
})

test.describe('the account order list', () => {
  test('an account with no orders says so plainly', async ({ page }) => {
    await page.goto(`${BASE}/sign-in`)
    await signIn(page)

    await expect(page).toHaveURL(/\/account$/)

    // The orders list is its own tab since the account page moved to the three
    // views behind one tab row (design.md §6.13).
    await page.getByRole('link', { name: 'Orders' }).click()

    await expect(page).toHaveURL(/\/account\?tab=orders$/)
    await expect(page.getByRole('heading', { name: 'Your orders' })).toBeVisible()
    await expect(page.getByText(/No orders yet/i)).toBeVisible()
  })
})
