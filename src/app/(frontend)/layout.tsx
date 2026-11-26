import type { Metadata, Viewport } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { Fraunces, Inter } from 'next/font/google'
import React from 'react'

import { JsonLd } from '@/components/JsonLd'
import type { Footer } from '@/payload-types'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

import './globals.css'
import { getServerSideURL } from '@/utilities/getURL'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { kitchenJsonLd, organizationJsonLd, websiteJsonLd } from '@/utilities/structuredData'

// Fraunces sets the headings, Inter the body and UI; the type scale stays unchanged.
const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The kitchen's contact details for the site-wide structured data. A failed
  // read only drops the phone, email and address from it, never the page.
  const footer = (await getCachedGlobal('footer', 1)().catch(() => null)) as Footer | null

  return (
    <html
      className={cn(fraunces.variable, inter.variable, GeistMono.variable)}
      data-theme="light"
      lang="en-IN"
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
        <link href="/favicon-32.png" rel="icon" sizes="32x32" type="image/png" />
        <link href="/favicon-192.png" rel="icon" sizes="192x192" type="image/png" />
        <link href="/apple-touch-icon.png" rel="apple-touch-icon" sizes="180x180" />
        {/* Who runs the site, the site and the kitchen, the same on every page.
            Each page adds its own nodes (WebPage, FAQ, breadcrumb) in its body. */}
        <JsonLd data={[organizationJsonLd(), websiteJsonLd(), kitchenJsonLd(footer?.contact)]} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  authors: [{ name: 'UNAVE' }],
  openGraph: mergeOpenGraph(),
  /* Indexable by default with full-size image previews and unlimited snippets.
     Private pages (cart, checkout, sign-in) set their own noindex, which wins. */
  robots: {
    follow: true,
    index: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
  // The kitchen serves Chennai, Tamil Nadu.
  other: {
    'geo.placename': 'Chennai',
    'geo.region': 'IN-TN',
  },
  /* Every page title ends in the brand, once. A page whose own title already
     names UNAVE sets `title: { absolute }` to skip the suffix. */
  title: {
    default: 'UNAVE | Cloud kitchen in Chennai',
    template: '%s | UNAVE',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

/** The browser chrome colour on mobile: the brand's deep green (--green-700). */
export const viewport: Viewport = {
  themeColor: '#1a4b36',
}
