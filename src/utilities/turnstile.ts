/**
 * Cloudflare Turnstile, the third bot trap on the public forms (server side only).
 *
 * The honeypot and the signed fill-time stamp (`formGuard.ts`) stop scripts that
 * post blind. Turnstile stops the ones that load the page first: the browser has
 * to pass Cloudflare's challenge, usually without the visitor seeing anything, and
 * the endpoint checks the resulting token with Cloudflare before doing real work.
 *
 * A pass needs three things from Cloudflare: success, the action of the form the
 * token was made on (so a token solved on one form cannot be spent on another),
 * and a hostname this deployment serves (`TURNSTILE_HOSTNAMES`, comma separated;
 * left unset it is the host of NEXT_PUBLIC_SERVER_URL). Production must never
 * list localhost.
 *
 * It is off until both keys are set, so local development and the tests run
 * without it. When Cloudflare itself cannot be reached the post is let through
 * and logged: an outage there should not close the contact form, and the
 * honeypot, the stamp and the rate limits still apply.
 */

/** The hidden input Turnstile writes its token into, inside the form. */
export const TURNSTILE_FIELD = 'cf-turnstile-response'

/** Header the Form block sends the token in, since it posts JSON, not the form. */
export const TURNSTILE_HEADER = 'x-turnstile-token'

import { getServerSideURL } from './getURL'
import type { TurnstileAction } from './turnstileActions'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TIMEOUT_MS = 5_000

type TurnstileConfig = { secretKey: string; siteKey: string }

const value = (name: string): string | undefined => {
  const raw = process.env[name]?.trim()
  return raw ? raw : undefined
}

export const readTurnstileConfig = (): TurnstileConfig | undefined => {
  const siteKey = value('TURNSTILE_SITE_KEY')
  const secretKey = value('TURNSTILE_SECRET_KEY')
  return siteKey && secretKey ? { secretKey, siteKey } : undefined
}

/** The frontend hostnames a token may come from on this deployment. */
export const turnstileHostnames = (): Set<string> => {
  const listed = (value('TURNSTILE_HOSTNAMES') ?? '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
  if (listed.length) return new Set(listed)
  try {
    return new Set([new URL(getServerSideURL()).hostname.toLowerCase()])
  } catch {
    return new Set()
  }
}

/** The public key for the widget, or undefined when Turnstile is off. */
export const turnstileSiteKey = (): string | undefined => readTurnstileConfig()?.siteKey

/**
 * - `ok`: Cloudflare accepted the token.
 * - `off`: no keys, so there is nothing to check.
 * - `unavailable`: Cloudflare could not be asked; let the post through.
 * - `missing` / `failed`: no token, or Cloudflare refused it; refuse the post.
 */
export type TurnstileResult = 'failed' | 'missing' | 'off' | 'ok' | 'unavailable'

/** True when the post may go on. */
export const turnstilePassed = (result: TurnstileResult): boolean =>
  result === 'ok' || result === 'off' || result === 'unavailable'

type CheckRequest = {
  headers: Headers
  payload: {
    logger: {
      info?: (entry: Record<string, unknown>) => void
      warn: (entry: Record<string, unknown>) => void
    }
  }
}

/**
 * The one call an endpoint makes: verify the posted token and log an outage.
 * True when the post may go on.
 */
export const confirmHuman = async (
  req: CheckRequest,
  token: unknown,
  /** The form's action, which the token must carry; also the scope it logs under. */
  scope: TurnstileAction,
): Promise<boolean> => {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || req.headers.get('x-real-ip')?.trim() || null
  const result = await verifyTurnstile(token, ip, scope)

  if (result === 'unavailable') req.payload.logger.warn({ msg: `${scope}_turnstile_unavailable` })
  if (!turnstilePassed(result)) req.payload.logger.info?.({ msg: `${scope}_turnstile_${result}` })

  return turnstilePassed(result)
}

export const verifyTurnstile = async (
  token: unknown,
  ip: string | null,
  expectedAction: TurnstileAction,
): Promise<TurnstileResult> => {
  const config = readTurnstileConfig()
  if (!config) return 'off'

  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) return 'missing'

  const body = new URLSearchParams({ response: token, secret: config.secretKey })
  if (ip) body.set('remoteip', ip)

  try {
    const response = await fetch(VERIFY_URL, {
      body,
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!response.ok) return 'unavailable'

    const result = (await response.json().catch(() => null)) as {
      action?: unknown
      hostname?: unknown
      success?: unknown
    } | null
    if (!result || typeof result.success !== 'boolean') return 'unavailable'
    if (!result.success) return 'failed'

    // A real answer from Cloudflare that does not match this form or this site is a refusal, not an outage.
    if (result.action !== expectedAction) return 'failed'
    const hostname = typeof result.hostname === 'string' ? result.hostname.toLowerCase() : ''
    if (!turnstileHostnames().has(hostname)) return 'failed'

    return 'ok'
  } catch {
    return 'unavailable'
  }
}
