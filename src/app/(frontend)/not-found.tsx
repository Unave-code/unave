import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import React from 'react'

import { NotFoundBand } from '@/components/NotFoundBand'

/**
 * The 404 for a page that called notFound() (a product or page slug that does
 * not exist). It sits outside the `(site)` group, so it draws the header and
 * footer itself — without that, one mistyped URL would land on a page with no
 * way back to the shop. URLs no route matches at all land on
 * `app/global-not-found.tsx` instead, which renders the same band.
 */
export default function NotFound() {
  return (
    <>
      <Header />
      <NotFoundBand />
      <Footer />
    </>
  )
}
