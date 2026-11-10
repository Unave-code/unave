import { readCookie, serializeCookie } from './customerSession'

/**
 * The cart cookie (spec 0007, AC-2 and AC-5).
 *
 * The basket is only identifiers: one product slug and one duration label per
 * line, plus a quantity. Meal plans carry quantity 1 — a plan line is the plan,
 * not an item to multiply — while one-time products (products sold without
 * durations) carry a real quantity between 1 and 10. No prices, no day counts
 * and no personal details live here, so a doctored cookie can at worst carry
 * junk that every later step refuses. Every price is read from the product
 * record on the server, at the cart page, at checkout and at order creation.
 *
 * The cookie is readable by JavaScript on purpose: the header count reads it so
 * the number updates the moment a line is added. It carries nothing private.
 */

export const CART_COOKIE = 'unave-cart'
export const CART_MAX_LINES = 10
export const CART_MAX_AGE = 60 * 60 * 24 * 30
/** The most of any one product a cart may hold. Steppers and the order endpoint both hold this line. */
export const CART_MAX_QTY = 10

/**
 * The duration label a one-time product's cart line carries. Durations are
 * labels staff type freely, so the label for "no duration" must be a value
 * nobody could type by accident: it is compared exactly, never loosely.
 */
export const ONE_TIME_DURATION = 'one-time'

/** The browser event the header listens for when a line is added or removed. */
export const CART_EVENT = 'unave:cart'

/** What identifies a line: the parts a cookie, a form field and a key all carry. */
export type CartLineIdentity = {
  /** The duration label of the chosen product line, or the reserved one-time value. */
  duration: string
  /** The product slug, never a title or an id. */
  product: string
}

export type CartLine = CartLineIdentity & {
  /** How many of the product the line holds. Plans are 1; one-time products, 1 to 10. */
  qty: number
}

type CartAddResult =
  | { lines: CartLine[]; ok: true }
  | { lines: CartLine[]; ok: false; reason: 'duplicate' | 'full' | 'quantity' }

const MAX_SLUG = 120
const MAX_DURATION = 80

const clean = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''

export const cartLineKey = (line: CartLineIdentity): string => `${line.product}\u0000${line.duration}`

export const sameCartLine = (a: CartLineIdentity, b: CartLineIdentity): boolean =>
  cartLineKey(a) === cartLineKey(b)

/**
 * The quantity exactly as the cookie wrote it: absent or unreadable reads as
 * one, and anything finite at one or more is kept untouched — including 2.5 or
 * 99 — so the order endpoint can refuse it rather than quietly fix a tampered
 * basket. Only rendering clamps.
 */
const qtyAsWritten = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return 1

  return value
}

/** True when a quantity may reach an order: a whole number between 1 and the cap. */
export const isValidCartQuantity = (qty: unknown): boolean =>
  typeof qty === 'number' && Number.isInteger(qty) && qty >= 1 && qty <= CART_MAX_QTY

/** The quantity a page renders: always a whole number between 1 and the cap. */
const clampQty = (qty: number): number =>
  Math.min(CART_MAX_QTY, Math.max(1, Math.round(qty || 1)))

/**
 * Every readable line in the cookie value, in order.
 *
 * Duplicates and overflow are kept here, because the order endpoint has to
 * refuse them rather than quietly fix a tampered basket. Rendering and adding
 * use `normalizeCartLines` on top.
 */
export const parseCartEntries = (raw: null | string | undefined): CartLine[] => {
  if (!raw) return []

  let decoded: unknown

  try {
    decoded = JSON.parse(decodeURIComponent(raw))
  } catch {
    return []
  }

  if (!Array.isArray(decoded)) return []

  const lines: CartLine[] = []

  for (const entry of decoded.slice(0, 50)) {
    if (!entry || typeof entry !== 'object') continue

    const product = clean((entry as { product?: unknown }).product, MAX_SLUG)
    const duration = clean((entry as { duration?: unknown }).duration, MAX_DURATION)

    if (product && duration) {
      lines.push({
        duration,
        product,
        qty: qtyAsWritten((entry as { qty?: unknown }).qty),
      })
    }
  }

  return lines
}

/** A cart safe to render: no duplicates, never more than the cap, sane quantities. */
export const normalizeCartLines = (entries: CartLine[]): CartLine[] => {
  const lines: CartLine[] = []
  const seen = new Set<string>()

  for (const entry of entries) {
    const key = cartLineKey(entry)

    if (seen.has(key)) continue

    seen.add(key)
    lines.push({ ...entry, qty: clampQty(entry.qty) })

    if (lines.length >= CART_MAX_LINES) break
  }

  return lines
}

export const hasDuplicateCartLines = (entries: CartLineIdentity[]): boolean => {
  const seen = new Set<string>()

  for (const entry of entries) {
    const key = cartLineKey(entry)
    if (seen.has(key)) return true
    seen.add(key)
  }

  return false
}

export const addCartLine = (lines: CartLine[], line: CartLineIdentity): CartAddResult => {
  const next: CartLine = {
    duration: clean(line.duration, MAX_DURATION),
    product: clean(line.product, MAX_SLUG),
    qty: 1,
  }

  if (!next.product || !next.duration) return { lines, ok: false, reason: 'full' }

  if (lines.some((existing) => sameCartLine(existing, next))) {
    return { lines, ok: false, reason: 'duplicate' }
  }

  if (lines.length >= CART_MAX_LINES) return { lines, ok: false, reason: 'full' }

  return { lines: [...lines, next], ok: true }
}

/**
 * Adding a one-time product, which has no durations to choose: the line's
 * duration is the reserved identifier and the quantity does the work. Adding
 * what is already there bumps it by one, up to the cap; at the cap the add is
 * refused with `quantity` so the cart can say so in one sentence.
 */
export const addOneTimeCartLine = (lines: CartLine[], product: string): CartAddResult => {
  const slug = clean(product, MAX_SLUG)

  if (!slug) return { lines, ok: false, reason: 'full' }

  const existing = lines.find(
    (line) => line.product === slug && line.duration === ONE_TIME_DURATION,
  )

  if (existing) {
    if (existing.qty >= CART_MAX_QTY) {
      return { lines, ok: false, reason: 'quantity' }
    }

    return {
      lines: lines.map((line) =>
        line === existing ? { ...line, qty: Math.min(CART_MAX_QTY, line.qty + 1) } : line,
      ),
      ok: true,
    }
  }

  if (lines.length >= CART_MAX_LINES) return { lines, ok: false, reason: 'full' }

  return { lines: [...lines, { duration: ONE_TIME_DURATION, product: slug, qty: 1 }], ok: true }
}

export const removeCartLine = (lines: CartLine[], key: string): CartLine[] =>
  lines.filter((line) => cartLineKey(line) !== key)

/**
 * The wire form of a line key, for hidden form fields.
 *
 * The in memory key joins with a NUL, which must never travel in an HTML
 * attribute. On the wire a line is a two element JSON array, so any slug or
 * duration label survives the round trip untouched. The quantity is not on the
 * wire: it lives in the cookie, and the quantity route reads it there.
 */
export const encodeCartLine = (line: CartLineIdentity): string =>
  JSON.stringify([line.product, line.duration])

export const decodeCartLine = (value: string): null | CartLineIdentity => {
  let parsed: unknown

  try {
    parsed = JSON.parse(value)
  } catch {
    return null
  }

  if (!Array.isArray(parsed) || parsed.length !== 2) return null

  const [product, duration] = parsed as unknown[]

  if (typeof product !== 'string' || typeof duration !== 'string') return null
  if (!product.trim() || !duration.trim()) return null

  return { duration, product }
}

/** The cart the pages render, read from a `Cookie` header or a cookie store value. */
export const readCart = (raw: null | string | undefined): CartLine[] =>
  normalizeCartLines(parseCartEntries(raw))

export const cartCookie = (lines: CartLine[]): string =>
  serializeCookie(CART_COOKIE, encodeURIComponent(JSON.stringify(lines)), {
    httpOnly: false,
    maxAge: CART_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

export const clearCartCookie = (): string =>
  serializeCookie(CART_COOKIE, '', {
    httpOnly: false,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

/** Read the cart from a request's `Cookie` header. */
export const readCartFromHeaders = (header: null | string | undefined): CartLine[] =>
  readCart(readCookie(header, CART_COOKIE))

/** The line count for the header. Browser only; zero during server rendering. */
export const cartCountInBrowser = (): number => {
  if (typeof document === 'undefined') return 0

  return readCartFromHeaders(document.cookie).reduce((sum, line) => sum + line.qty, 0)
}
