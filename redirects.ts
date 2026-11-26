import type { NextConfig } from 'next'

export const redirects: NextConfig['redirects'] = async () => {
  const internetExplorerRedirect = {
    destination: '/ie-incompatible.html',
    has: [
      {
        type: 'header' as const,
        key: 'user-agent',
        value: '(.*Trident.*)', // all ie browsers
      },
    ],
    permanent: false,
    source: '/:path((?!ie-incompatible.html$).*)', // all pages except the incompatibility page
  }

  /* Product addresses fixed for typos (migration 20261126_160000_product_name_fixes).
     The old ones were already shared and indexed, so they move permanently. */
  const productRedirects = [
    { destination: '/products/coriander', permanent: true, source: '/products/coriender' },
    {
      destination: '/products/paneer-tikka-sandwich',
      permanent: true,
      source: '/products/panner-tikka-sandwich',
    },
    {
      destination: '/products/apple-beetroot-carrot',
      permanent: true,
      source: '/products/apply-beetroot-carrot',
    },
  ]

  // The plan builder moved to /meal-subscription.
  const planRedirects = [{ destination: '/meal-subscription', permanent: true, source: '/plan-builder' }]

  return [...productRedirects, ...planRedirects, internetExplorerRedirect]
}
