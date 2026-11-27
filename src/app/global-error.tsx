'use client'

import * as Sentry from '@sentry/nextjs'
import React, { useEffect } from 'react'

import { fraunces, inter } from './(frontend)/fonts'
import './(frontend)/globals.css'

/**
 * The last resort when a root layout itself throws. It replaces the layout, so
 * it draws its own <html>, and it skips the CMS header and footer: they may be
 * what failed. The error goes to Sentry; the visitor gets one way forward.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html className={`${fraunces.variable} ${inter.variable}`} data-theme="light" lang="en-IN">
      <body className="bg-cream text-ink-900 font-sans">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-5 px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">UNAVE</p>
          <h1 className="font-serif text-4xl leading-tight text-green-900">
            Something went wrong on our side.
          </h1>
          <p className="text-lg text-ink-600">
            We have been told about it. Try the page again, or come back in a few minutes.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              className="inline-flex min-h-11 items-center rounded-full bg-green-700 px-6 font-semibold text-cream transition-colors hover:bg-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
              onClick={() => retry()}
              type="button"
            >
              Try again
            </button>
            {/* A full load, not a client navigation: the app shell is what broke. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="inline-flex min-h-11 items-center font-semibold text-green-700 underline underline-offset-4" href="/">
              Go to the home page
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
