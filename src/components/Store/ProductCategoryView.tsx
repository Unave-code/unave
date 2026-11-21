import Link from 'next/link'
import React from 'react'

import { CategoryTiles, type CategoryTile } from '@/components/CategoryTiles'
import { Cta } from '@/components/Cta'
import { Section } from '@/components/home/Section'
import { MealPlanCard } from '@/components/Store/MealPlanCard'
import { ProductShelf } from '@/components/Store/ProductShelf'
import { Swoosh } from '@/components/Swoosh'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import type { Footer } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'
import {
  EMPTY_SHELF,
  fetchProductShelf,
  parseShelfState,
  shelfHref,
  type ShelfSearchParams,
} from '@/utilities/productShelf'
import { normalizeMealPlan } from '@/utilities/planBuilder'
import { fetchCategorySubcategories, fetchCategoryMealPlans } from '@/utilities/products'
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
 * included with nothing to buy. In place of the filter bar the page offers its
 * subcategories as the same round tiles the homepage uses for categories; a
 * tile writes `?subcategory=` into the address, so a narrowed shelf can be
 * linked and reloaded like any other view, and "All" clears it.
 */
export const ProductCategoryView: React.FC<{
  category: ProductCategoryValue
  searchParams?: ShelfSearchParams
}> = async ({ category, searchParams = {} }) => {
  const state = parseShelfState(searchParams)

  /* Only the subcategory travels on a category page now that the filter bar is
     gone, so a stale filter in an old link cannot hide products with no way
     to clear it. The page number is kept. */
  const shelfState = { ...EMPTY_SHELF, page: state.page, subcategory: state.subcategory }
  const basePath = productCategoryHref(category)

  const [result, categorySubcategories, mealPlanDocs] = await Promise.all([
    fetchProductShelf(shelfState, category),
    fetchCategorySubcategories(category),
    // Meal plans live in their own collection; they join the shelf on page one only.
    state.page > 1 ? Promise.resolve([]) : fetchCategoryMealPlans(category, shelfState.subcategory),
  ])
  const mealPlans = mealPlanDocs.map((doc) => normalizeMealPlan(doc)).filter((plan) => plan.plans.length > 0)

  const subcategories = categorySubcategories.filter((item) => item.slug)
  const tiles: CategoryTile[] =
    subcategories.length > 0
      ? [
          {
            category,
            current: !shelfState.subcategory,
            href: basePath,
            key: 'all',
            title: 'All',
          },
          ...subcategories.map((item) => ({
            category,
            current: shelfState.subcategory === item.slug,
            href: shelfHref(basePath, { ...EMPTY_SHELF, subcategory: item.slug ?? null }),
            image: item.image && typeof item.image === 'object' ? item.image : null,
            key: item.id,
            title: item.title,
          })),
        ]
      : []

  const copy = PRODUCT_CATEGORY_COPY[category]
  const otherCategories = (
    Object.keys(CATEGORY_LABEL) as Array<keyof typeof CATEGORY_LABEL>
  ).filter((value) => value !== category)

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

      <Section id="products" tone="tint">
        <CategoryTiles className="mb-8 px-6 md:mb-10" label={`${CATEGORY_LABEL[category]} subcategories`} tiles={tiles} />

        {mealPlans.length > 0 ? (
          <ul aria-label="Meal plans" className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {mealPlans.map((plan) => (
              <li className="min-w-0" key={plan.slug}>
                <MealPlanCard plan={plan} />
              </li>
            ))}
          </ul>
        ) : null}

        <ProductShelf
          basePath={basePath}
          hideEmpty={mealPlans.length > 0}
          category={category}
          result={result}
          showControls={false}
          state={shelfState}
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

      <Section tone="white">
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
