import type { Metadata } from 'next'
import React from 'react'

import { JsonLd } from '@/components/JsonLd'
import { BestSellers } from '@/components/home/BestSellers'
import { Faq } from '@/components/home/Faq'
import { Gallery } from '@/components/home/Gallery'
import { Hero } from '@/components/home/Hero'
import { Testimonials } from '@/components/home/Testimonials'
import type { Footer } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'
import {
  FAQ,
  HOME_DESCRIPTION,
  HOME_SHARE_DESCRIPTION,
  HOME_TITLE,
  HOME_TWITTER_DESCRIPTION,
} from '@/utilities/homeCopy'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import {
  faqJsonLd,
  homePageJsonLd,
  kitchenJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from '@/utilities/structuredData'

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
  description: HOME_DESCRIPTION,
  openGraph: mergeOpenGraph({
    description: HOME_SHARE_DESCRIPTION,
    title: HOME_TITLE,
    url: '/',
  }),
  // The title already names UNAVE, so the layout's suffix is skipped.
  title: { absolute: HOME_TITLE },
  twitter: {
    card: 'summary_large_image',
    description: HOME_TWITTER_DESCRIPTION,
    images: [{ alt: 'UNAVE cloud kitchen in Chennai', url: '/og.png' }],
    title: HOME_TITLE,
  },
}

export default async function HomePage() {
  const footer = (await getCachedGlobal('footer', 1)()) as Footer | null

  return (
    <main>
      {/* The kitchen, the site and the questions on this page (design.md §13). */}
      <JsonLd
        data={[
          organizationJsonLd(),
          websiteJsonLd(),
          homePageJsonLd(HOME_TITLE, HOME_DESCRIPTION),
          kitchenJsonLd(footer?.contact),
          faqJsonLd(FAQ),
        ]}
      />

      <Hero />
      <Gallery />
      <BestSellers />
      <Testimonials />
      <Faq />
    </main>
  )
}
