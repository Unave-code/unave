import * as Sentry from '@sentry/nextjs'

import { beforeSend, dataCollection, sentryEnabled } from './scrub'

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

/**
 * The server side of Sentry, started once from `src/instrumentation.ts`.
 *
 * Next's `onRequestError` only sees errors that escape a request. Most of the
 * failures here are caught and written to `payload.logger` instead, the
 * webhook, order and mail paths especially, so the pino integration turns
 * every `logger.error` into an issue, along with the payment warnings listed
 * in `ALERT_WARNINGS`. Logs are not shipped; only issues are.
 */
Sentry.init({
  beforeSend,
  dataCollection,
  dsn,
  enabled: sentryEnabled(dsn),
  environment: process.env.SENTRY_ENVIRONMENT || 'production',
  integrations: [
    Sentry.pinoIntegration({
      error: { levels: ['warn', 'error', 'fatal'] },
      log: { levels: [] },
    }),
  ],
})
