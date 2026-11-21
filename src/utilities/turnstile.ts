/**
 * Cloudflare Turnstile, the third bot trap on the public forms (server side only).
 *
 * The honeypot and the signed fill-time stamp (`formGuard.ts`) stop scripts that
 * post blind. Turnstile stops the ones that load the page first: the browser has
 * to pass Cloudflare's challenge, usually without the visitor seeing anything, and
 * the endpoint checks the resulting token with Cloudflare before doing real work.
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
  scope: string,
): Promise<boolean> => {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || req.headers.get('x-real-ip')?.trim() || null
  const result = await verifyTurnstile(token, ip)

  if (result === 'unavailable') req.payload.logger.warn({ msg: `${scope}_turnstile_unavailable` })
  if (!turnstilePassed(result)) req.payload.logger.info?.({ msg: `${scope}_turnstile_${result}` })

  return turnstilePassed(result)
}

export const verifyTurnstile = async (
  token: unknown,
  ip: string | null,
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

    const result = (await response.json().catch(() => null)) as { success?: unknown } | null
    if (!result || typeof result.success !== 'boolean') return 'unavailable'

    return result.success ? 'ok' : 'failed'
  } catch {
    return 'unavailable'
  }
}
