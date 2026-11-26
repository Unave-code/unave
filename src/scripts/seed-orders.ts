import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'
import type { Order, Product } from '../payload-types'
import { ONE_TIME_DURATION } from '../utilities/cart'
import { normalizeMealPlan, type PlanSlot, pricePlanSelection } from '../utilities/planBuilder'

/**
 * Dev seed: a handful of paid orders for the seed customer (single items, sizes,
 * a combo, a meal plan product, built meal subscriptions and a 3-day trial),
 * plus one open pause request, so the account Orders tab and the admin Orders list have rows to show.
 *
 * Orders are written straight through the Local API with `overrideAccess`, the
 * way `recordPaidOrder` writes them, but without the Razorpay round trip and
 * without the order emails. The gateway ids are fake (`order_seed_*`), so these
 * rows never match a real payment.
 *
 * Needs the catalogue seeded first (`pnpm seed:catalogue`); lines whose product
 * is missing are skipped. Creates the seed customer if it does not exist.
 *
 * Idempotent: each order is matched by its gateway order id and skipped when it
 * already exists. Refuses to run against a non-local database unless
 * SEED_ALLOW_REMOTE=1. Amounts are in paise (₹1 = 100).
 */

const host = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? '').hostname
  } catch {
    return ''
  }
})()
const LOCAL = ['localhost', '127.0.0.1', '::1', 'postgres', 'db', 'host.docker.internal']
if (!LOCAL.includes(host) && process.env.SEED_ALLOW_REMOTE !== '1') {
  console.error(`Refusing to seed: DATABASE_URL host "${host}" is not local. Set SEED_ALLOW_REMOTE=1 to override.`)
  process.exit(1)
}

const EMAIL = process.env.SEED_CUSTOMER_EMAIL ?? 'dummy@unave.test'
const PASSWORD = process.env.SEED_CUSTOMER_PASSWORD ?? 'dummy-password-123'
const NAME = process.env.SEED_CUSTOMER_NAME ?? 'Dummy Customer'

const payload = await getPayload({ config })
const counts = { backfilled: 0, created: 0, skipped: 0, failed: 0 }

/* Customer */
let customer = (
  await payload.find({ collection: 'customers', depth: 0, limit: 1, overrideAccess: true, where: { email: { equals: EMAIL } } })
).docs[0]

if (!customer) {
  customer = await payload.create({
    collection: 'customers',
    data: { email: EMAIL, hasPassword: true, name: NAME, password: PASSWORD },
    depth: 0,
    disableVerificationEmail: true,
    overrideAccess: true,
  })
  await payload.db.updateOne({
    collection: 'customers',
    data: { _verificationToken: null, _verified: true },
    id: customer.id,
  })
  payload.logger.info(`Created seed customer ${EMAIL} (password: ${PASSWORD}).`)
}

/* Products */
const productCache = new Map<string, Product | null>()
const product = async (slug: string): Promise<Product | null> => {
  if (!productCache.has(slug)) {
    const doc = (
      await payload.find({ collection: 'products', depth: 0, limit: 1, overrideAccess: true, where: { slug: { equals: slug } } })
    ).docs[0]
    productCache.set(slug, (doc as Product | undefined) ?? null)
  }
  return productCache.get(slug) ?? null
}

type LineSeed =
  | { slug: string; kind: 'one-time'; qty?: number }
  | { slug: string; kind: 'size'; size: string; qty?: number }
  | { slug: string; kind: 'plan'; duration: string }
  | { slug: string; kind: 'combo'; qty?: number }
  /** A plan built on /meal-subscription; `length: 'trial'` picks the plan's trial length. */
  | { slug: string; kind: 'subscription'; slot: PlanSlot; length: string; choices: number[][] }

type OrderItem = NonNullable<Order['items']>[number]

const subscriptionLine = async (seed: Extract<LineSeed, { kind: 'subscription' }>): Promise<OrderItem | null> => {
  const doc = (
    await payload.find({ collection: 'meal-plans', depth: 1, limit: 1, overrideAccess: true, where: { slug: { equals: seed.slug } } })
  ).docs[0]
  if (!doc) {
    payload.logger.warn(`Meal plan ${seed.slug} is missing; run pnpm seed:catalogue first. Line skipped.`)
    return null
  }
  const data = normalizeMealPlan(doc)
  const length = seed.length === 'trial' ? data.plans.find((p) => p.trial)?.label : seed.length
  if (!length) {
    payload.logger.warn(`Meal plan ${seed.slug} has no trial length; run pnpm seed:catalogue. Line skipped.`)
    return null
  }
  const priced = pricePlanSelection(data, { breakfast: false, choices: seed.choices, plan: length, slot: seed.slot })
  if (!priced) {
    payload.logger.warn(`Meal plan ${seed.slug}: the selection no longer prices. Line skipped.`)
    return null
  }
  // The shape the order endpoint writes for a built plan: no product, the choices in the label.
  return { product: null, productTitle: `Meal plan: ${data.title}`, days: priced.days, durationLabel: priced.detail, qty: 1, unitPrice: priced.total }
}

const line = async (seed: LineSeed): Promise<OrderItem | null> => {
  if (seed.kind === 'subscription') return subscriptionLine(seed)
  const p = await product(seed.slug)
  if (!p) {
    payload.logger.warn(`Product ${seed.slug} is missing; run pnpm seed:catalogue first. Line skipped.`)
    return null
  }

  const base = { product: p.id, productTitle: p.title }

  if (seed.kind === 'plan') {
    const d = p.durations?.find((x) => x.label === seed.duration)
    if (!d) return null
    return { ...base, days: d.days, durationLabel: d.label, qty: 1, unitPrice: d.price }
  }

  if (seed.kind === 'size') {
    const s = p.sizes?.find((x) => x.label === seed.size)
    if (!s) return null
    return { ...base, days: 0, durationLabel: s.label, qty: seed.qty ?? 1, unitPrice: s.price }
  }

  if (seed.kind === 'combo') {
    const components = await Promise.all(
      (p.components ?? []).map(async (c) => {
        const id = typeof c.product === 'object' && c.product ? c.product.id : c.product
        const found = await payload.findByID({ collection: 'products', depth: 0, id: id as number, overrideAccess: true })
        return { product: found.id, productTitle: found.title, durationLabel: ONE_TIME_DURATION, days: 0 }
      }),
    )
    return { ...base, components, days: 0, durationLabel: ONE_TIME_DURATION, qty: seed.qty ?? 1, unitPrice: p.price ?? 0 }
  }

  return { ...base, days: 0, durationLabel: ONE_TIME_DURATION, qty: seed.qty ?? 1, unitPrice: p.price ?? 0 }
}

const delivery = {
  name: NAME,
  phone: '9876543210',
  addressLine1: '12, Green Park Apartments',
  addressLine2: 'Near Lake Road',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
  foodPreference: 'vegetarian',
}

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()

/** What Razorpay would have sent for each seed order: a mix of methods, fee at 2% with 18% GST on it. */
const PAYMENT_METHODS: Record<string, Omit<NonNullable<Order['payment']>, 'capturedAt' | 'fee' | 'tax'>> = {
  seed_1: { method: 'upi', vpa: 'dummy@okhdfcbank', bankReference: '432118765401' },
  seed_2: { method: 'card', cardNetwork: 'Visa', cardType: 'debit', cardLast4: '0153', bankReference: '432118765402' },
  seed_3: { method: 'netbanking', bank: 'HDFC', bankReference: 'HDFC0000432118' },
  seed_4: { method: 'wallet', wallet: 'payzapp' },
  seed_5: { method: 'upi', vpa: 'dummy@ybl', bankReference: '432118765405' },
  seed_6: { method: 'card', cardNetwork: 'MasterCard', cardType: 'credit', cardLast4: '4444', bankReference: '432118765406' },
  seed_7: { method: 'upi', vpa: 'dummy@paytm', bankReference: '432118765407' },
  seed_8: { method: 'upi', vpa: 'dummy@okicici', bankReference: '432118765408' },
  seed_9: { method: 'upi', vpa: 'dummy@okhdfcbank', bankReference: '432118765409' },
  seed_10: { method: 'card', cardNetwork: 'RuPay', cardType: 'debit', cardLast4: '6011', bankReference: '432118765410' },
}

const paymentFor = (key: string, total: number, paidAt: string): NonNullable<Order['payment']> => {
  const fee = Math.round(total * 0.02)
  return {
    ...PAYMENT_METHODS[key],
    capturedAt: paidAt,
    contact: '+919876543210',
    email: EMAIL,
    fee,
    tax: Math.round(fee * 0.18),
  }
}

const orders: { key: string; paidDaysAgo: number; startsInDays?: number; note?: string; lines: LineSeed[] }[] = [
  {
    key: 'seed_1',
    paidDaysAgo: 21,
    startsInDays: -19,
    lines: [{ slug: 'diabetic-friendly-lunch-plan', kind: 'plan', duration: '2 weeks' }],
  },
  {
    key: 'seed_2',
    paidDaysAgo: 9,
    lines: [
      { slug: 'masala-oats-upma', kind: 'one-time', qty: 2 },
      { slug: 'paneer-tikka-bowl', kind: 'one-time' },
    ],
  },
  {
    key: 'seed_3',
    paidDaysAgo: 5,
    note: 'Please ring the bell twice.',
    lines: [
      { slug: 'ready-to-cook-millet-dosa-batter', kind: 'size', size: '1 kg' },
      { slug: 'seasonal-vegetable-basket', kind: 'one-time' },
    ],
  },
  {
    key: 'seed_4',
    paidDaysAgo: 2,
    lines: [{ slug: 'breakfast-and-lunch-combo', kind: 'combo', qty: 3 }],
  },
  {
    key: 'seed_5',
    paidDaysAgo: 0,
    startsInDays: 2,
    lines: [
      { slug: 'diabetic-friendly-lunch-plan', kind: 'plan', duration: '1 month' },
      { slug: 'kids-mini-paratha-box', kind: 'one-time', qty: 4 },
    ],
  },
  {
    key: 'seed_6',
    paidDaysAgo: 3,
    startsInDays: 1,
    note: 'Leave the box with the security desk.',
    lines: [
      // Lunch and dinner, two weeks, rice and detox juice.
      { slug: 'everyday-indian', kind: 'subscription', slot: 'both', length: '2 weeks', choices: [[1], [2]] },
      { slug: 'dal-khichdi-dinner', kind: 'one-time' },
    ],
  },
  {
    key: 'seed_7',
    paidDaysAgo: 1,
    lines: [{ slug: 'kids-lunch-box', kind: 'subscription', slot: 'lunch', length: '1 month', choices: [[1]] }],
  },
  {
    key: 'seed_8',
    paidDaysAgo: 0,
    lines: [
      // The 3-day trial: lunch, roti and normal juice.
      { slug: 'everyday-indian', kind: 'subscription', slot: 'lunch', length: 'trial', choices: [[0], [1]] },
    ],
  },
  {
    key: 'seed_9',
    paidDaysAgo: 0,
    startsInDays: 3,
    note: 'No onion or garlic, please.',
    lines: [
      // Every group used: quinoa, medium spice, two protein add-ons, two drinks and sides; lunch and dinner.
      { slug: 'high-protein-meals', kind: 'subscription', slot: 'both', length: '1 week', choices: [[2], [1], [0, 1], [0, 2]] },
    ],
  },
  {
    key: 'seed_10',
    paidDaysAgo: 0,
    lines: [
      // A trial with options and one add-on, sitting beside a plain subscription with none.
      { slug: 'high-protein-meals', kind: 'subscription', slot: 'dinner', length: 'trial', choices: [[1], [0], [2], []] },
      { slug: 'low-gi-dinner', kind: 'subscription', slot: 'dinner', length: '2 weeks', choices: [] },
    ],
  },
]

const seeded: Record<string, number> = {}

for (const seed of orders) {
  const gatewayOrderId = `order_${seed.key}`
  const existing = (
    await payload.find({ collection: 'orders', depth: 0, limit: 1, overrideAccess: true, where: { gatewayOrderId: { equals: gatewayOrderId } } })
  ).docs[0]

  if (existing) {
    seeded[seed.key] = existing.id
    // Seed rows written before payment details were stored get them filled in.
    if (!existing.payment?.method && PAYMENT_METHODS[seed.key]) {
      await payload.update({
        collection: 'orders',
        data: { payment: paymentFor(seed.key, Number(existing.total), existing.paidAt ?? daysAgo(seed.paidDaysAgo)) },
        depth: 0,
        id: existing.id,
        overrideAccess: true,
      })
      counts.backfilled++
    }
    counts.skipped++
    continue
  }

  try {
    const items = (await Promise.all(seed.lines.map(line))).filter((x): x is OrderItem => x !== null)
    if (items.length === 0) {
      counts.failed++
      payload.logger.error(`Order ${seed.key}: no usable lines.`)
      continue
    }

    const total = items.reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.qty ?? 1), 0)
    const doc = await payload.create({
      collection: 'orders',
      data: {
        customer: customer.id,
        delivery: { ...delivery, ...(seed.note ? { note: seed.note } : {}) },
        gatewayOrderId,
        gatewayPaymentId: `pay_${seed.key}`,
        items,
        paidAt: daysAgo(seed.paidDaysAgo),
        payment: paymentFor(seed.key, total, daysAgo(seed.paidDaysAgo)),
        ...(seed.startsInDays !== undefined ? { startsOn: daysAgo(-seed.startsInDays) } : {}),
        subtotal: total,
        total,
      },
      depth: 0,
      overrideAccess: true,
    })
    seeded[seed.key] = doc.id
    counts.created++
  } catch (error) {
    counts.failed++
    payload.logger.error(`Order ${seed.key}: ${(error as Error).message}`)
  }
}

payload.logger.info(
  `Orders: ${counts.created} created, ${counts.skipped} already there (${counts.backfilled} given payment details), ${counts.failed} failed. Sign in as ${EMAIL} to see them.`,
)

process.exit(counts.failed > 0 ? 1 : 0)
