import { fetchAudiences } from '@/utilities/audiences'
import type { Metadata } from 'next'
import React from 'react'

import Link from 'next/link'

import { Cta } from '@/components/Cta'
import { JsonLd } from '@/components/JsonLd'
import { Section } from '@/components/home/Section'
import { ProductShelf } from '@/components/Store/ProductShelf'
import { Swoosh } from '@/components/Swoosh'
import type { Footer } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { CATEGORY_LABEL, productCategoryHref } from '@/utilities/productsCategoryCopy'
import { breadcrumbJsonLd, itemListJsonLd, webPageJsonLd } from '@/utilities/structuredData'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import {
  fetchProductShelf,
  hasShelfFilters,
  parseShelfState,
  type ShelfSearchParams,
} from '@/utilities/productShelf'
import {
  PRODUCTS_CTA_BROWSE,
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
  PRODUCTS_RANGES,
  PRODUCTS_RANGES_COLUMNS,
  PRODUCTS_RANGES_HEADING,
  PRODUCTS_RANGES_INTRO,
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

  const [result, audiences] = await Promise.all([fetchProductShelf(state), fetchAudiences()])

  const footer = (await getCachedGlobal('footer', 1)()) as Footer | null
  const whatsapp = footer?.contact?.whatsapp ?? null

  return (
    <main>
      <JsonLd
        data={[
          webPageJsonLd('CollectionPage', '/products', PRODUCTS_PAGE_TITLE, PRODUCTS_PAGE_DESCRIPTION),
          breadcrumbJsonLd([
            { href: '/', label: 'Home' },
            { href: '/products', label: 'Products' },
          ]),
          itemListJsonLd(
            'UNAVE product ranges',
            PRODUCTS_RANGES.map((range) => ({
              href: productCategoryHref(range.category),
              name: CATEGORY_LABEL[range.category],
            })),
          ),
        ]}
      />

      <Section className="opening-band relative overflow-hidden bg-green-900 md:py-20" tone="green">
        <Swoosh className="-top-40 -right-32 w-[42rem] text-gold-400/[0.08]" />

        <div className="relative max-w-[46rem]">
          {/* The eyebrow sits inside the h1 so the heading names the page's query. */}
          <h1 className="text-display text-balance">
            <span className="text-eyebrow text-gold-400 mb-4 block uppercase">{PRODUCTS_HERO_EYEBROW}</span>
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

      {/* The three ranges side by side, each linking to its own page. */}
      <Section tone="cream">
        <h2 className="text-h2">{PRODUCTS_RANGES_HEADING}</h2>
        <p className="text-body text-ink-600 mt-3 max-w-[60ch]">{PRODUCTS_RANGES_INTRO}</p>

        <div className="border-line mt-8 overflow-x-auto rounded-2xl border bg-white">
          <table className="text-body w-full min-w-[40rem] text-left">
            <thead className="bg-green-50 text-green-900">
              <tr>
                {PRODUCTS_RANGES_COLUMNS.map((column) => (
                  <th className="px-5 py-4 font-bold" key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {PRODUCTS_RANGES.map((range) => (
                <tr key={range.category}>
                  <th className="px-5 py-4 align-top font-bold" scope="row">
                    <Link
                      className="inline-flex min-h-11 items-center rounded-sm text-green-700 underline underline-offset-4 hover:text-green-600 focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none"
                      href={productCategoryHref(range.category)}
                    >
                      {CATEGORY_LABEL[range.category]}
                    </Link>
                  </th>
                  <td className="text-ink-600 px-5 py-4 align-top">{range.what}</td>
                  <td className="text-ink-600 px-5 py-4 align-top">{range.cooking}</td>
                  <td className="text-ink-600 px-5 py-4 align-top">{range.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="products" tone="white">
        <h2 className="text-h2">{PRODUCTS_GRID_HEADING}</h2>
        <p className="text-body text-ink-600 mt-3 max-w-[60ch]">{PRODUCTS_GRID_INTRO}</p>

        <ProductShelf
          audiences={audiences.map((audience) => ({ label: audience.title, value: audience.slug }))}
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
    </main>
  )
}
