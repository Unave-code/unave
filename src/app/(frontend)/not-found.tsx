import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import React from 'react'

import { Cta } from '@/components/Cta'
import { Section } from '@/components/home/Section'
import { Swoosh } from '@/components/Swoosh'

/**
 * The 404 (design.md §6.17), wearing the opening band every page shares (§6.3).
 *
 * It sits outside the `(site)` group, so it draws the header and footer itself —
 * without that, one mistyped URL would land on a page with no way back to the
 * shop. The band is the brand's answer to being lost: deep green and the swoosh,
 * a headline that says what happened in the kitchen's own voice, and one way
 * back into the shop beside one quiet way home. Nothing here needs an account.
 */
export default function NotFound() {
  return (
    <>
      <Header />
      <main>
        <Section
          className="opening-band relative overflow-hidden bg-green-900 md:py-20"
          tone="green"
        >
          <Swoosh className="-top-40 -right-32 w-[42rem] text-gold-400/[0.08]" />

          <div className="relative max-w-[46rem]">
            <p className="text-eyebrow text-gold-400 uppercase">Error 404</p>

            <h1 className="text-display mt-4 text-balance">
              This page is not <span className="text-gold-400 whitespace-nowrap italic">on the menu</span>
            </h1>

            <p className="text-lead text-cream/85 mt-6 max-w-[52ch]">
              The link may be old, or the address mistyped. The kitchen is still open, and
              everything we cook is one tap away.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Cta href="/products" variant="onDark">
                Browse the products
              </Cta>
              <Cta href="/" variant="onDarkSecondary">
                Back to the home page
              </Cta>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  )
}
