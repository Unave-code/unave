import type { Metadata } from 'next'
import React from 'react'

import { JsonLd } from '@/components/JsonLd'
import { BestSellers } from '@/components/home/BestSellers'
import { Faq } from '@/components/home/Faq'
import { Gallery } from '@/components/home/Gallery'
import { Hero } from '@/components/home/Hero'
import { Testimonials } from '@/components/home/Testimonials'
import {
  FAQ,
  HOME_DESCRIPTION,
  HOME_SHARE_DESCRIPTION,
  HOME_TITLE,
  HOME_TWITTER_DESCRIPTION,
} from '@/utilities/homeCopy'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { faqJsonLd, homePageJsonLd } from '@/utilities/structuredData'

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

export default function HomePage() {
  return (
    <main>
      {/* This page and its questions (design.md §13); the organisation, site and
          kitchen are in the root layout's head. */}
      <JsonLd data={[homePageJsonLd(HOME_TITLE, HOME_DESCRIPTION), faqJsonLd(FAQ)]} />

      <Hero />
      <Gallery />
      <BestSellers />
      <Testimonials />
      <Faq />
    </main>
  )
}
