import type { Metadata } from 'next'
import { getServerSideURL } from './getURL'

/** The site-wide share image, 1200 x 630. A page with its own image replaces it. */
export const DEFAULT_OG_IMAGE = {
  alt: 'UNAVE cloud kitchen in Chennai: fresh produce, ready-to-cook and ready-to-eat meals',
  height: 630,
  type: 'image/png',
  width: 1200,
}

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description:
    'UNAVE is a cloud kitchen in Chennai: ready-to-eat home-style meals, ready-to-cook food and fresh produce, cooked in our own kitchen and delivered to your door.',
  images: [
    {
      ...DEFAULT_OG_IMAGE,
      secureUrl: `${getServerSideURL()}/og.png`,
      url: `${getServerSideURL()}/og.png`,
    },
  ],
  locale: 'en_IN',
  siteName: 'UNAVE',
  title: 'UNAVE',
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
