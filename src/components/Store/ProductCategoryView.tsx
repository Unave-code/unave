import Link from 'next/link'
import React from 'react'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { CategoryTiles, type CategoryTile } from '@/components/CategoryTiles'
import { Cta } from '@/components/Cta'
import { JsonLd } from '@/components/JsonLd'
import { Faq } from '@/components/home/Faq'
import { Section } from '@/components/home/Section'
import { MealPlanCard } from '@/components/Store/MealPlanCard'
import { ProductShelf } from '@/components/Store/ProductShelf'
import { Swoosh } from '@/components/Swoosh'
import type { CategoryPage, Footer } from '@/payload-types'
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
  PRODUCT_CATEGORY_COPY,
  productCategoryHref,
  type ProductCategoryValue,
} from '@/utilities/productsCategoryCopy'
import { breadcrumbJsonLd, faqJsonLd, webPageJsonLd } from '@/utilities/structuredData'
import { cn } from '@/utilities/ui'

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
/** The photograph beside each category's questions: the same one the about page gives the range. */
const FAQ_IMAGES: Record<ProductCategoryValue, { alt: string; src: string }> = {
  'fresh-from-produce': { alt: 'Fresh vegetables and fruit from the market', src: '/images/about/farm-products.webp' },
  'ready-to-cook': { alt: 'Cut vegetables and measured masalas, ready to cook', src: '/images/about/ready-to-cook.webp' },
  'ready-to-eat': { alt: 'A home-style meal cooked in the UNAVE kitchen', src: '/images/category-healthy.jpg' },
}

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
    // Meal plans live in their own collection; they open the shelf's grid on page one only.
    state.page > 1 ? Promise.resolve([]) : fetchCategoryMealPlans(category, shelfState.subcategory),
  ])
  const mealPlans = mealPlanDocs
    .map((doc) => normalizeMealPlan(doc))
    .filter((plan) => plan.plans.length > 0)

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

  const [footer, pages] = await Promise.all([
    getCachedGlobal('footer', 1)() as Promise<Footer | null>,
    getCachedGlobal('category-pages', 1)() as Promise<CategoryPage | null>,
  ])
  const whatsapp = footer?.contact?.whatsapp ?? null
  const headerField = {
    'fresh-from-produce': 'freshFromProduce',
    'ready-to-cook': 'readyToCook',
    'ready-to-eat': 'readyToEat',
  } as const
  const rawImage = pages?.[headerField[category]]
  const headerImage = rawImage && typeof rawImage === 'object' && rawImage.url ? rawImage : null

  const crumbs = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Products' },
    { href: basePath, label: CATEGORY_LABEL[category] },
  ]

  return (
    <main>
      <JsonLd
        data={[
          webPageJsonLd('CollectionPage', basePath, copy.metaTitle, copy.metaDescription),
          breadcrumbJsonLd(crumbs),
          faqJsonLd(copy.faq),
        ]}
      />

      <Section
        className={cn(
          'opening-band relative overflow-hidden bg-green-900',
          headerImage ? 'md:py-32' : 'md:py-20',
        )}
        image={headerImage?.url ? { priority: true, src: headerImage.url } : undefined}
        tone="green"
      >
        {headerImage ? null : (
          <Swoosh className="-top-40 -right-32 w-[42rem] text-gold-400/[0.08]" />
        )}

        <div className="relative max-w-[46rem]">
          <Breadcrumbs
            className="mb-4"
            items={crumbs.map((crumb, index) =>
              index === crumbs.length - 1 ? { label: crumb.label } : crumb,
            )}
            tone="onDark"
          />

          {/* The eyebrow sits inside the h1 so the heading names the page's query. */}
          <h1 className="text-display text-balance">
            <span className="text-eyebrow text-gold-400 mb-4 block uppercase">{copy.eyebrow}</span>
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
        <CategoryTiles
          className="mb-8 px-6 md:mb-10"
          label={`${CATEGORY_LABEL[category]} subcategories`}
          tiles={tiles}
        />

        <ProductShelf
          basePath={basePath}
          category={category}
          leading={mealPlans.map((plan) => ({ key: `meal-plan-${plan.slug}`, node: <MealPlanCard plan={plan} /> }))}
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

      <Faq heading={copy.faqHeading} image={FAQ_IMAGES[category]} items={copy.faq} />
    </main>
  )
}
