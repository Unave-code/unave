import Link from 'next/link'
import React from 'react'

import { Cta } from '@/components/Cta'
import { Section } from '@/components/home/Section'
import { ProductShelf } from '@/components/Store/ProductShelf'
import { Swoosh } from '@/components/Swoosh'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import type { Footer } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'
import {
  fetchProductShelf,
  parseShelfState,
  type ShelfSearchParams,
} from '@/utilities/productShelf'
import {
  CATEGORY_LABEL,
  PRODUCTS_CATEGORY_CTA_BROWSE,
  PRODUCTS_CATEGORY_FINAL_BODY,
  PRODUCTS_CATEGORY_FINAL_HEADING,
  PRODUCT_CATEGORY_COPY,
  productCategoryHref,
  type ProductCategoryValue,
} from '@/utilities/productsCategoryCopy'
import { PRODUCTS_CTA_MESSAGE } from '@/utilities/productsCopy'
import { whatsappHref } from '@/utilities/whatsapp'

/**
 * A page per product category (spec 0008; design.md §6.19):
 * /products/ready-to-cook, /products/ready-to-eat and /products/fresh-from-produce,
 * rendered by the one `/products/[slug]` route when the slug is a category.
 *
 * The shelf reads live product rows of exactly one category, paused ones
 * included with nothing to buy, and it carries the same search, filters, sort
 * and pages `/products` does. The category itself is the page rather than a
 * filter, so it is pinned here and never offered as a choice; every other
 * control writes the address, so a filtered category shelf can be linked and
 * reloaded like any other view.
 */
export const ProductCategoryView: React.FC<{
  category: ProductCategoryValue
  searchParams?: ShelfSearchParams
}> = async ({ category, searchParams = {} }) => {
  const state = parseShelfState(searchParams)

  const result = await fetchProductShelf(state, category)

  const copy = PRODUCT_CATEGORY_COPY[category]
  const otherCategories = (Object.keys(CATEGORY_LABEL) as Array<keyof typeof CATEGORY_LABEL>).filter(
    (value) => value !== category,
  )

  const footer = (await getCachedGlobal('footer', 1)()) as Footer | null
  const whatsapp = footer?.contact?.whatsapp ?? null

  return (
    <main>
      <Section className="opening-band relative overflow-hidden bg-green-900 md:py-20" tone="green">
        <Swoosh className="-top-40 -right-32 w-[42rem] text-gold-400/[0.08]" />

        <div className="relative max-w-[46rem]">
          <p className="text-eyebrow text-gold-400 uppercase">{copy.eyebrow}</p>

          <h1 className="text-display mt-4 text-balance">
            {copy.headline}{' '}
            <span className="text-gold-400 whitespace-nowrap italic">{copy.headlineAccent}</span>
          </h1>

          <p className="text-lead text-cream/85 mt-6 max-w-[52ch]">{copy.intro}</p>

          <div className="mt-8">
            <Cta href="#products" variant="onDark">
              {PRODUCTS_CATEGORY_CTA_BROWSE}
            </Cta>
          </div>
        </div>
      </Section>

      <Section id="products" tone="white">
        <ProductShelf
          basePath={productCategoryHref(category)}
          category={category}
          result={result}
          state={state}
          whatsapp={whatsapp}
        />

        <div className="border-line mt-10 border-t pt-6">
          <p className="text-body text-ink-600">
            Not quite what you need? The other shelves:{' '}
            {otherCategories.map((value, index) => (
              <React.Fragment key={value}>
                <Link
                  className="text-green-700 font-bold underline hover:text-green-600 focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none"
                  href={productCategoryHref(value)}
                >
                  {CATEGORY_LABEL[value]}
                </Link>
                {index < otherCategories.length - 1 ? ' · ' : ''}
              </React.Fragment>
            ))}
          </p>
        </div>
      </Section>

      <Section tone="tint">
        <div className="max-w-[52ch]">
          <h2 className="text-h2">{PRODUCTS_CATEGORY_FINAL_HEADING}</h2>
          <p className="text-body text-ink-600 mt-3">{PRODUCTS_CATEGORY_FINAL_BODY}</p>

          <div className="mt-8">
            {whatsapp ? (
              <Cta
                href={whatsappHref(whatsapp)}
                rel="noopener noreferrer"
                target="_blank"
                variant="primary"
              >
                <WhatsAppIcon className="size-4" />
                {PRODUCTS_CTA_MESSAGE}
              </Cta>
            ) : (
              <Cta href="/products" variant="primary">
                {PRODUCTS_CATEGORY_CTA_BROWSE}
              </Cta>
            )}
          </div>
        </div>
      </Section>
    </main>
  )
}
