import * as Sentry from '@sentry/nextjs'

/** Starts error tracking before the server takes its first request. */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry/server')
  }
}

/** Server render, route handler, server action and proxy errors that escape. */
export const onRequestError = Sentry.captureRequestError
