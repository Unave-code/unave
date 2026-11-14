import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { auditRoutes, type AuditRoute } from './routes'

/**
 * Launch audit capture: one full-page screenshot per route per viewport, plus
 * overflow, axe (WCAG 2.2 AA) and 44px target findings, written as JSON beside
 * the shots. Findings never fail the test; only a page that cannot load does.
 */

const OUT = path.resolve('.lavish/audit')
const PASSWORD = 'audit-horse-battery-staple'
const email = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@unave.test`
let customerId: number | string | undefined

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  test.setTimeout(180_000)
  const payload = await getPayload({ config })
  const created = await payload.create({
    collection: 'customers',
    data: { email, name: 'Audit Customer', password: PASSWORD },
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
  if (customerId === undefined) return
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'customers', id: customerId, overrideAccess: true }).catch(() => {})
})

const addToCart = async (page: Page) => {
  await page.goto('/products/sambar-podi')
  const radio = page.getByRole('radio').first()
  if (await radio.count()) await radio.check({ force: true })
  await page.getByRole('button', { name: 'Add to cart' }).first().click({ force: true })
  await expect
    .poll(async () => (await page.context().cookies()).some((c) => c.name === 'unave-cart'), { timeout: 20_000 })
    .toBe(true)
}

const prepare = async (page: Page, route: AuditRoute) => {
  if (route.setup === 'filledCart') await addToCart(page)
  if (route.setup === 'signedIn') {
    await page.goto('/sign-in')
    await page.fill('#signin-email', email)
    await page.fill('#signin-password', PASSWORD)
    await page.getByRole('button', { name: /Sign in/i }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/sign-in'), { timeout: 30_000 })
    await addToCart(page)
  }
  await page.goto(route.path)
  if (route.setup === 'formError') {
    await page.fill('[name="name"]', 'A')
    await page.fill('[name="email"]', 'not-an-email')
    await page.evaluate(() => document.querySelectorAll('form').forEach((f) => (f.noValidate = true)))
    await page.locator('form[action="/api/enquiries/send"] button[type="submit"]').click()
    await page.waitForLoadState('networkidle')
  }
}

for (const route of auditRoutes) {
  test(route.id, async ({ page }, info) => {
    const project = info.project.name
    fs.mkdirSync(path.join(OUT, 'shots', project), { recursive: true })
    fs.mkdirSync(path.join(OUT, 'checks'), { recursive: true })

    await prepare(page, route)
    await page.waitForLoadState('networkidle')
    await page.addStyleTag({
      content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
    })
    await page.waitForTimeout(400)

    await page.screenshot({ fullPage: true, path: path.join(OUT, 'shots', project, `${route.id}.png`) })

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))

    const smallTargets = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('a[href], button, input:not([type=hidden]), select, textarea, [role=button]'))
        .filter((el) => {
          const r = el.getBoundingClientRect()
          const s = getComputedStyle(el)
          if (r.width === 0 || r.height === 0 || s.visibility === 'hidden') return false
          // A pseudo-element grows this hit area past its painted box.
          if (el.dataset.hitArea === '44') return false
          // Inline links inside running text are exempt under WCAG 2.5.8.
          if (el.tagName === 'A' && s.display === 'inline' && el.closest('p, li')) return false
          return r.width < 44 || r.height < 44
        })
        .slice(0, 40)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 60),
          w: Math.round(el.getBoundingClientRect().width),
          h: Math.round(el.getBoundingClientRect().height),
        })),
    )

    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()

    fs.writeFileSync(
      path.join(OUT, 'checks', `${project}-${route.id}.json`),
      JSON.stringify(
        {
          id: route.id,
          path: route.path,
          project,
          finalUrl: page.url(),
          overflow: overflow.scrollWidth > overflow.innerWidth ? overflow : null,
          smallTargets,
          axe: axe.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            nodes: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
            count: v.nodes.length,
          })),
        },
        null,
        1,
      ),
    )
  })
}
