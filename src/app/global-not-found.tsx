import type { Metadata } from 'next'
import React from 'react'

import { NotFoundBand } from '@/components/NotFoundBand'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { cn } from '@/utilities/ui'

import { fraunces, inter } from './(frontend)/fonts'
import './(frontend)/globals.css'

/**
 * The 404 for every URL no route matches (experimental.globalNotFound).
 *
 * The app has two root layouts — `(frontend)` and `(payload)` — so there is no
 * single `app/not-found` to compose from, and a notFound() thrown inside the
 * `(frontend)` tree came back as an empty HTML shell that only drew itself
 * once the browser ran the JavaScript. This file is rendered on its own, with
 * a real 404 status and the whole page in the server HTML, so crawlers and slow
 * phones see the brand's 404 rather than a blank page. It skips every layout,
 * so it loads the fonts, the global styles and the chrome itself.
 */
/* Rendered per request, like every other (frontend) page: the header and footer
   are CMS globals, and the image build has no database, so a 404 prerendered at
   build time would carry fallback chrome until the next deploy. */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  description: 'The page you were looking for is not on the UNAVE site.',
  title: 'Page not found | UNAVE',
}

export default function GlobalNotFound() {
  return (
    <html
      className={cn(fraunces.variable, inter.variable)}
      data-theme="light"
      lang="en-IN"
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
        <link href="/favicon-32.png" rel="icon" sizes="32x32" type="image/png" />
        <link href="/apple-touch-icon.png" rel="apple-touch-icon" sizes="180x180" />
      </head>
      <body>
        <Providers>
          <Header />
          <NotFoundBand />
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
