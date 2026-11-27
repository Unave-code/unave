import type { ErrorEvent, EventHint } from '@sentry/nextjs'

/**
 * What Sentry may see, and what it never does.
 *
 * Runs as `beforeSend` in the browser and on the server. It drops the errors
 * that are not faults (a wrong password, a 404), lets only the warnings that
 * mean money or an order went astray through, groups our own log codes by code
 * rather than by the text of whatever error they carry, and takes every
 * customer detail out before the event leaves: emails, phone numbers,
 * addresses, cookies, request bodies and the tokens that ride in reset and
 * verify links. Customer data is personal data under the DPDP Act, and an error
 * tracker never needs it to tell us what broke.
 */

const REDACTED = '[redacted]'

/** Payload errors that describe the visitor, not the code. */
const EXPECTED_ERRORS = new Set([
  'AuthenticationError',
  'Forbidden',
  'Locked',
  'LockedAuth',
  'MissingFile',
  'NotFound',
  'UnverifiedEmail',
  'ValidationError',
])

/**
 * `logger.warn` codes worth an alert: each means a customer may have paid
 * without an order, or an order may not have reached the kitchen. Every other
 * warning stays in the container log only.
 */
export const ALERT_WARNINGS = new Set([
  'order_create_not_configured',
  'order_confirmation_mail_not_sent',
  'order_kitchen_mail_no_recipient',
  'order_kitchen_mail_not_sent',
  'order_return_gateway_order_unreadable',
  'order_return_payment_fetch_failed',
  'order_return_payment_mismatch',
  'order_return_payment_not_captured',
  'payment_alert_mail_no_recipient',
  'payment_alert_mail_not_sent',
  'razorpay_webhook_amount_mismatch',
  'razorpay_webhook_intent_missing',
  'razorpay_webhook_order_unreadable',
])

const SENSITIVE_KEY =
  /pass(word)?|secret|token|signature|authorization|cookie|e-?mail|phone|mobile|address|pin_?code|post_?code|^name$|(first|last|full)_?name/i

const EMAIL = /[^\s@"'<>,;:]+@[^\s@"'<>,;:]+\.[a-z]{2,}/gi
const INDIAN_PHONE = /(?:\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/g
const SECRET_QUERY = /([?&](?:token|code|state|email|signature)=)[^&#\s]*/gi

export const scrubString = (value: string): string =>
  value
    .replace(SECRET_QUERY, `$1${REDACTED}`)
    .replace(EMAIL, REDACTED)
    .replace(INDIAN_PHONE, REDACTED)

export const scrubValue = (value: unknown, depth = 0): unknown => {
  if (typeof value === 'string') return scrubString(value)
  if (depth > 6 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1))

  const out: Record<string, unknown> = {}

  for (const [key, item] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY.test(key) ? REDACTED : scrubValue(item, depth + 1)
  }

  return out
}

const errorName = (error: unknown): string | undefined =>
  error && typeof error === 'object' && 'name' in error ? String(error.name) : undefined

/** The snake_case code our own `payload.logger` calls carry in `msg`. */
const logCode = (event: ErrorEvent): string | undefined => {
  const msg = event.contexts?.pino?.msg

  return typeof msg === 'string' && /^[a-z0-9_]+$/.test(msg) ? msg : undefined
}

export const beforeSend = (event: ErrorEvent, hint: EventHint): ErrorEvent | null => {
  const name = errorName(hint?.originalException) ?? event.exception?.values?.[0]?.type
  if (name && EXPECTED_ERRORS.has(name)) return null

  const code = logCode(event)

  if (event.logger === 'pino' && event.level === 'warning' && !(code && ALERT_WARNINGS.has(code))) {
    return null
  }

  // One issue per code, however the wrapped error's text varies.
  if (code) event.fingerprint = ['pino', code]

  delete event.user

  if (event.request) {
    const userAgent = event.request.headers?.['user-agent']

    delete event.request.cookies
    delete event.request.data
    delete event.request.query_string
    event.request.headers = userAgent ? { 'user-agent': userAgent } : {}
    if (event.request.url) event.request.url = scrubString(event.request.url.split('?')[0] ?? '')
  }

  if (event.message) event.message = scrubString(event.message)

  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = scrubString(exception.value)
  }

  if (event.contexts) {
    // Sentry's own contexts describe the machine and runtime, never a customer.
    const { app, culture, device, os, runtime, trace, ...rest } = event.contexts
    event.contexts = {
      ...(scrubValue(rest) as ErrorEvent['contexts']),
      app,
      culture,
      device,
      os,
      runtime,
      trace,
    }
  }
  if (event.extra) event.extra = scrubValue(event.extra) as ErrorEvent['extra']
  if (event.tags) event.tags = scrubValue(event.tags) as ErrorEvent['tags']

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
      ...crumb,
      data: crumb.data ? (scrubValue(crumb.data) as typeof crumb.data) : crumb.data,
      message: crumb.message ? scrubString(crumb.message) : crumb.message,
    }))
  }

  return event
}

/**
 * Sentry 11 collects headers, cookies, bodies, query strings, database values
 * and stack frame variables by default. None of it is needed to see what broke,
 * and all of it can hold a customer's details, so all of it is off; only the
 * user agent header is kept, to tell a browser bug from a phone bug.
 */
export const dataCollection = {
  cookies: false,
  databaseQueryData: false,
  genAI: { inputs: false, outputs: false },
  graphQL: { document: false, variables: false },
  httpBodies: [],
  httpHeaders: { request: { allow: ['user-agent'] }, response: false },
  mcp: { inputs: false, outputs: false },
  queues: false,
  stackFrameVariables: false,
  urlQueryParams: false,
  userInfo: false,
} satisfies NonNullable<Parameters<typeof import('@sentry/nextjs').init>[0]['dataCollection']>

/** On only in a production build with a DSN, so dev, tests and CI send nothing. */
export const sentryEnabled = (dsn: string | undefined): boolean =>
  Boolean(dsn) && process.env.NODE_ENV === 'production'
