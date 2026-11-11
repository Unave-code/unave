import type { Metadata } from 'next'
import React from 'react'

import { Cta } from '@/components/Cta'
import { Section } from '@/components/home/Section'
import { ProductShelf } from '@/components/Store/ProductShelf'
import { Swoosh } from '@/components/Swoosh'
import type { Footer } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import {
  fetchProductShelf,
  hasShelfFilters,
  parseShelfState,
  type ShelfSearchParams,
} from '@/utilities/productShelf'
import {
  PRODUCTS_CTA_BROWSE,
  PRODUCTS_FINAL_BODY,
  PRODUCTS_FINAL_HEADING,
  PRODUCTS_GRID_HEADING,
  PRODUCTS_GRID_INTRO,
  PRODUCTS_HERO_EYEBROW,
  PRODUCTS_HERO_HEADLINE,
  PRODUCTS_HERO_HEADLINE_ACCENT,
  PRODUCTS_HERO_SUB,
  PRODUCTS_HOW_HEADING,
  PRODUCTS_HOW_STEPS,
  PRODUCTS_PAGE_DESCRIPTION,
  PRODUCTS_PAGE_TITLE,
} from '@/utilities/productsCopy'

/**
 * The products shelf (spec 0007, AC-1 and AC-2; design.md §6.19). Anyone can
 * look, no account asked for, and every product that is not hidden renders,
 * paused ones included.
 *
 * The shelf reads live product rows and its search, filters, sort and page all
 * live in the address, so any view of it can be linked, bookmarked and reloaded
 * and the page works with JavaScript off.
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ShelfSearchParams>
}): Promise<Metadata> {
  const state = parseShelfState(await searchParams)

  return {
    alternates: { canonical: '/products' },
    description: PRODUCTS_PAGE_DESCRIPTION,
    openGraph: mergeOpenGraph({
      description: PRODUCTS_PAGE_DESCRIPTION,
      title: PRODUCTS_PAGE_TITLE,
      url: '/products',
    }),
    /* A filtered shelf is a view of one page, not a page of its own: the
       canonical points at the shelf, and a filtered view stays out of the
       index, so the catalogue never becomes dozens of near identical pages.
       Paging is left alone — those are the same products, linked. */
    robots: hasShelfFilters(state) ? { follow: true, index: false } : undefined,
    title: PRODUCTS_PAGE_TITLE,
  }
}

const STEP_NUMBER =
  'bg-green-100 text-green-700 grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<ShelfSearchParams>
}) {
  const state = parseShelfState(await searchParams)

  const result = await fetchProductShelf(state)

  const footer = (await getCachedGlobal('footer', 1)()) as Footer | null
  const whatsapp = footer?.contact?.whatsapp ?? null

  return (
    <main>
      <Section
        className="opening-band relative overflow-hidden bg-green-900 md:py-20"
        tone="green"
      >
        <Swoosh className="-top-40 -right-32 w-[42rem] text-gold-400/[0.08]" />

        <div className="relative max-w-[46rem]">
          <p className="text-eyebrow text-gold-400 uppercase">{PRODUCTS_HERO_EYEBROW}</p>

          <h1 className="text-display mt-4 text-balance">
            {PRODUCTS_HERO_HEADLINE}{' '}
            <span className="text-gold-400 whitespace-nowrap italic">
              {PRODUCTS_HERO_HEADLINE_ACCENT}
            </span>
          </h1>

          <p className="text-lead text-cream/85 mt-6 max-w-[52ch]">{PRODUCTS_HERO_SUB}</p>

          <div className="mt-8">
            <Cta href="#products" variant="onDark">
              {PRODUCTS_CTA_BROWSE}
            </Cta>
          </div>
        </div>
      </Section>

      <Section id="products" tone="white">
        <h2 className="text-h2">{PRODUCTS_GRID_HEADING}</h2>
        <p className="text-body text-ink-600 mt-3 max-w-[60ch]">{PRODUCTS_GRID_INTRO}</p>

        <ProductShelf
          basePath="/products"
          result={result}
          state={state}
          whatsapp={whatsapp}
        />
      </Section>

      <Section tone="tint">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
          <div>
            <h2 className="text-h2">{PRODUCTS_HOW_HEADING}</h2>
            <p className="text-body text-ink-600 mt-3 max-w-[45ch]">
              Three steps, and none of them ask you to remember a thing.
            </p>
          </div>

          <ol className="flex flex-col gap-8">
            {PRODUCTS_HOW_STEPS.map((step, index) => (
              <li className="flex gap-4" key={step.title}>
                <span aria-hidden="true" className={STEP_NUMBER}>
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-h3">{step.title}</h3>
                  <p className="text-body text-ink-600 mt-2 max-w-[55ch]">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section tone="white">
        <div className="max-w-[52ch]">
          <h2 className="text-h2">{PRODUCTS_FINAL_HEADING}</h2>
          <p className="text-body text-ink-600 mt-3">{PRODUCTS_FINAL_BODY}</p>

          <div className="mt-8">
            <Cta href="#products" variant="primary">
              {PRODUCTS_CTA_BROWSE}
            </Cta>
          </div>
        </div>
      </Section>
    </main>
  )
}
