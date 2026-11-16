import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Bot traps shared by every public form (server side only).
 *
 * Two cheap checks run before any real work, so a script costs us almost
 * nothing and a person never notices them:
 *
 * 1. A honeypot. `FORM_HONEYPOT_FIELD` is drawn off screen and out of the tab
 *    order; a person leaves it empty and a form-filling script does not.
 * 2. A signed fill-time stamp. The page signs the moment it was drawn with
 *    `PAYLOAD_SECRET`, and the endpoint refuses a stamp that is missing,
 *    forged, sent faster than a person can type, or older than a day. A script
 *    that posts straight at the endpoint has no stamp; one that replays an old
 *    stamp is refused once it ages out.
 *
 * Neither replaces validation, the same-origin check or the rate limits. They
 * only take the noisiest traffic off the top.
 */

/** Shared with the contact form, which used the name first. */
export const FORM_HONEYPOT_FIELD = 'website'
export const FORM_STAMP_FIELD = 'form_stamp'

/** Faster than this is a script. Autofill plus one click still takes longer. */
export const FORM_MIN_FILL_MS = 1500
/** Older than this, the page has sat open long enough to ask for a fresh one. */
export const FORM_MAX_AGE_MS = 24 * 60 * 60 * 1000

const secret = (): string => process.env.PAYLOAD_SECRET || 'unave-form-guard'

const sign = (issuedAt: string): string =>
  createHmac('sha256', secret()).update(`form:${issuedAt}`).digest('base64url')

/** A fresh stamp for a form being drawn now. */
export const issueFormStamp = (now: number = Date.now()): string => {
  const issuedAt = String(now)
  return `${issuedAt}.${sign(issuedAt)}`
}

export type FormGuardResult = 'expired' | 'honeypot' | 'ok' | 'stamp' | 'too-fast'

const stampAge = (stamp: string, now: number): null | number => {
  const [issuedAt, signature] = stamp.split('.')
  if (!issuedAt || !signature || !/^\d{1,16}$/.test(issuedAt)) return null

  const expected = Buffer.from(sign(issuedAt))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null

  return now - Number(issuedAt)
}

/**
 * Read both traps from a posted form. Pass `requireStamp: false` for a form
 * the page cannot stamp (a client-side JSON post); the honeypot still applies.
 */
export const checkFormGuard = (
  fields: Record<string, unknown>,
  { now = Date.now(), requireStamp = true }: { now?: number; requireStamp?: boolean } = {},
): FormGuardResult => {
  const trap = fields[FORM_HONEYPOT_FIELD]
  if (typeof trap === 'string' && trap.trim() !== '') return 'honeypot'

  if (!requireStamp) return 'ok'

  const stamp = fields[FORM_STAMP_FIELD]
  if (typeof stamp !== 'string' || stamp.length > 200) return 'stamp'

  const age = stampAge(stamp, now)
  if (age === null) return 'stamp'
  if (age < FORM_MIN_FILL_MS) return 'too-fast'
  if (age > FORM_MAX_AGE_MS) return 'expired'

  return 'ok'
}
