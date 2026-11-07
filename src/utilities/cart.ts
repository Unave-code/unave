import { readCookie, serializeCookie } from './customerSession'

/**
 * The cart cookie (spec 0007, AC-2 and AC-5).
 *
 * The basket is only identifiers: one product slug and one duration label per
 * line. No prices, no day counts and no personal details live here, so a
 * doctored cookie can at worst carry junk that every later step refuses. Every
 * price is read from the product record on the server, at the cart page, at
 * checkout and at order creation.
 *
 * The cookie is readable by JavaScript on purpose: the header count reads it so
 * the number updates the moment a line is added. It carries nothing private.
 */

export const CART_COOKIE = 'unave-cart'
export const CART_MAX_LINES = 10
export const CART_MAX_AGE = 60 * 60 * 24 * 30

/** The browser event the header listens for when a line is added or removed. */
export const CART_EVENT = 'unave:cart'

export type CartLine = {
  /** The duration label of the chosen product line. */
  duration: string
  /** The product slug, never a title or an id. */
  product: string
}

type CartAddResult =
  | { lines: CartLine[]; ok: true }
  | { lines: CartLine[]; ok: false; reason: 'duplicate' | 'full' }

const MAX_SLUG = 120
const MAX_DURATION = 80

const clean = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''

export const cartLineKey = (line: CartLine): string => `${line.product}\u0000${line.duration}`

export const sameCartLine = (a: CartLine, b: CartLine): boolean =>
  cartLineKey(a) === cartLineKey(b)

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

    if (product && duration) lines.push({ duration, product })
  }

  return lines
}

/** A cart safe to render: no duplicates, never more than the cap. */
export const normalizeCartLines = (entries: CartLine[]): CartLine[] => {
  const lines: CartLine[] = []
  const seen = new Set<string>()

  for (const entry of entries) {
    const key = cartLineKey(entry)

    if (seen.has(key)) continue

    seen.add(key)
    lines.push(entry)

    if (lines.length >= CART_MAX_LINES) break
  }

  return lines
}

export const hasDuplicateCartLines = (entries: CartLine[]): boolean => {
  const seen = new Set<string>()

  for (const entry of entries) {
    const key = cartLineKey(entry)
    if (seen.has(key)) return true
    seen.add(key)
  }

  return false
}

export const addCartLine = (lines: CartLine[], line: CartLine): CartAddResult => {
  const next: CartLine = {
    duration: clean(line.duration, MAX_DURATION),
    product: clean(line.product, MAX_SLUG),
  }

  if (!next.product || !next.duration) return { lines, ok: false, reason: 'full' }

  if (lines.some((existing) => sameCartLine(existing, next))) {
    return { lines, ok: false, reason: 'duplicate' }
  }

  if (lines.length >= CART_MAX_LINES) return { lines, ok: false, reason: 'full' }

  return { lines: [...lines, next], ok: true }
}

export const removeCartLine = (lines: CartLine[], key: string): CartLine[] =>
  lines.filter((line) => cartLineKey(line) !== key)

/**
 * The wire form of a line key, for hidden form fields.
 *
 * The in memory key joins with a NUL, which must never travel in an HTML
 * attribute. On the wire a line is a two element JSON array, so any slug or
 * duration label survives the round trip untouched.
 */
export const encodeCartLine = (line: CartLine): string => JSON.stringify([line.product, line.duration])

export const decodeCartLine = (value: string): null | CartLine => {
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

  return readCartFromHeaders(document.cookie).length
}
