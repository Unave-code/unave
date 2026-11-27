import * as Sentry from '@sentry/nextjs'

import { beforeSend, dataCollection, sentryEnabled } from './sentry/scrub'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

/**
 * Browser errors, for the site and the admin alike. No tracing and no session
 * replay: replay records what customers type and see, and the free plan does
 * not need the extra events.
 */
Sentry.init({
  beforeSend,
  dataCollection,
  dsn,
  enabled: sentryEnabled(dsn),
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'production',
  ignoreErrors: [
    // Browser noise that says nothing about this site.
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
  ],
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
