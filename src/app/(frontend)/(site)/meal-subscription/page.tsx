import { Baby, HeartPulse, User, Users, type LucideIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { CategoryTiles, type CategoryTile } from '@/components/CategoryTiles'
import { Cta } from '@/components/Cta'
import { Section } from '@/components/home/Section'
import { MealPlanCard } from '@/components/Store/MealPlanCard'
import { Swoosh } from '@/components/Swoosh'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import type { Footer } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { parseMealPlanShelf, type MealPlanSearchParams } from '@/utilities/mealPlanShelf'
import { MEAL_PLANS_PATH, normalizeMealPlan } from '@/utilities/planBuilder'
import { CATEGORY_LABEL, productCategoryHref } from '@/utilities/productsCategoryCopy'
import { PRODUCTS_CTA_MESSAGE } from '@/utilities/productsCopy'
import { whatsappHref } from '@/utilities/whatsapp'

export const dynamic = 'force-dynamic'

const COPY = {
  heading: 'A fresh home-style menu',
  accent: 'every week',
  intro: 'Choose a meal plan, see what we are cooking this week, pick your options, then pay securely.',
  browse: 'Browse the meal plans',
  family: 'Feeding a family? Add more than one plan to your cart and pay for them together.',
  audienceLabel: 'Who it is for',
  subcategoryLabel: 'Kind of plan',
  noMatch: 'No meal plan matches both choices.',
  showAll: 'Show all meal plans',
  otherShelves: 'Not quite what you need? The other shelves:',
  finalHeading: 'Ready when you are',
  finalBody:
    'Pick a plan, choose your options and pay once at checkout, and the kitchen takes it from there. Questions first? We are one message away.',
}

/** Audiences carry no photo, so each well-known one gets its own icon. */
const AUDIENCE_ICONS: Record<string, LucideIcon> = {
  adult: User,
  adults: User,
  child: Baby,
  children: Baby,
  kid: Baby,
  kids: Baby,
  special: HeartPulse,
}

const NOTICES: Record<string, string> = {
  changed: 'That meal plan changed or is no longer offered. Please pick one again.',
  unknown: 'That did not go through. Please try again.',
}

export const metadata: Metadata = {
  alternates: { canonical: MEAL_PLANS_PATH },
  description: 'Weekly home-style meal plans. Pick a plan, see the menu, choose your options and pay securely.',
  title: 'Meal subscription',
}

/**
 * Every meal plan as a shelf, built like a category page (design.md §6.15,
 * §6.19): the green opening band, then on the tint band two rows of tiles, who
 * the plan is for (`?audience=`) and its subcategory (`?subcategory=`), each
 * with "All" to clear it and each keeping the other choice, then the card grid,
 * the other shelves and the closing band. A slug no plan uses is ignored, so a
 * stale link shows every plan rather than none.
 */
export default async function MealPlansPage({ searchParams }: { searchParams: Promise<MealPlanSearchParams> }) {
  const raw = await searchParams
  const noticeKey = typeof raw.notice === 'string' ? raw.notice : null
  const notice = noticeKey ? (NOTICES[noticeKey] ?? NOTICES.unknown) : null

  const payload = await getPayload({ config: configPromise })
  const [all, footer] = await Promise.all([
    payload.find({ collection: 'meal-plans', depth: 1, limit: 100, sort: 'position' }),
    getCachedGlobal('footer', 1)() as Promise<Footer | null>,
  ])
  const whatsapp = footer?.contact?.whatsapp ?? null

  const plans = all.docs.map((doc) => normalizeMealPlan(doc)).filter((plan) => plan.plans.length > 0)

  /* One tile per subcategory and per audience some plan uses, in plan order. */
  const usedSlugs = [...new Set(plans.flatMap((plan) => (plan.subcategory ? [plan.subcategory.slug] : [])))]
  const subcategoryDocs = usedSlugs.length
    ? (await payload.find({ collection: 'subcategories', depth: 1, limit: usedSlugs.length, where: { slug: { in: usedSlugs } } })).docs
    : []
  const subcategories = usedSlugs.flatMap((slug) => subcategoryDocs.filter((doc) => doc.slug === slug))
  const audiences = [
    ...new Map(
      plans.flatMap((plan) => (plan.audience?.slug ? [[plan.audience.slug, plan.audience] as const] : [])),
    ).values(),
  ]

  const askedSubcategory = typeof raw.subcategory === 'string' ? raw.subcategory : null
  const subcategory = subcategories.some((item) => item.slug === askedSubcategory) ? askedSubcategory : null
  const askedAudience = parseMealPlanShelf(raw).audience
  const audience = audiences.some((item) => item.slug === askedAudience) ? askedAudience : null

  const shown = plans.filter(
    (plan) =>
      (!subcategory || plan.subcategory?.slug === subcategory) &&
      (!audience || plan.audience?.slug === audience),
  )
  const filtered = Boolean(subcategory || audience)

  const filterHref = (next: { audience: null | string; subcategory: null | string }) => {
    const query = new URLSearchParams()
    if (next.audience) query.set('audience', next.audience)
    if (next.subcategory) query.set('subcategory', next.subcategory)
    const search = query.toString()
    return `${MEAL_PLANS_PATH}${search ? `?${search}` : ''}#meal-plans`
  }

  const audienceTiles: CategoryTile[] =
    audiences.length > 0
      ? [
          { current: !audience, href: filterHref({ audience: null, subcategory }), icon: Users, key: 'all', title: 'All' },
          ...audiences.map((item) => ({
            current: audience === item.slug,
            href: filterHref({ audience: item.slug, subcategory }),
            icon: AUDIENCE_ICONS[item.slug] ?? Users,
            key: item.slug,
            title: item.title,
          })),
        ]
      : []
  const subcategoryTiles: CategoryTile[] =
    subcategories.length > 0
      ? [
          { category: 'ready-to-eat', current: !subcategory, href: filterHref({ audience, subcategory: null }), key: 'all', title: 'All' },
          ...subcategories.map((item) => ({
            category: item.category,
            current: subcategory === item.slug,
            href: filterHref({ audience, subcategory: item.slug }),
            image: item.image && typeof item.image === 'object' ? item.image : null,
            key: item.id,
            title: item.title,
          })),
        ]
      : []
  const bothRows = audienceTiles.length > 0 && subcategoryTiles.length > 0

  return (
    <main>
      <Section className="opening-band relative overflow-hidden bg-green-900 md:py-20" tone="green">
        <Swoosh className="-top-40 -right-32 w-[42rem] text-gold-400/[0.08]" />
        <div className="relative max-w-[46rem]">
          <h1 className="text-display text-balance">
            {COPY.heading} <span className="text-gold-400 whitespace-nowrap italic">{COPY.accent}</span>
          </h1>
          <p className="text-lead text-cream/85 mt-6 max-w-[52ch]">{COPY.intro}</p>
          <div className="mt-8">
            <Cta href="#meal-plans" variant="onDark">
              {COPY.browse}
            </Cta>
          </div>
        </div>
      </Section>

      <Section id="meal-plans" tone="tint">
        <h2 className="sr-only">Meal plans</h2>

        {audienceTiles.length > 0 ? (
          <div className="mb-8 md:mb-10">
            {bothRows ? (
              <p className="mb-3 text-center text-sm font-bold text-green-900">{COPY.audienceLabel}</p>
            ) : null}
            <CategoryTiles className="px-6" label="Who the meal plans are for" noun="meal plans" tiles={audienceTiles} />
          </div>
        ) : null}

        {subcategoryTiles.length > 0 ? (
          <div className="mb-8 md:mb-10">
            {bothRows ? (
              <p className="mb-3 text-center text-sm font-bold text-green-900">{COPY.subcategoryLabel}</p>
            ) : null}
            <CategoryTiles className="px-6" label="Meal plan subcategories" noun="meal plans" tiles={subcategoryTiles} />
          </div>
        ) : null}

        {notice ? (
          <p className="bg-gold-100 border-gold-300 text-ink-900 mt-6 rounded-2xl border px-5 py-4 text-base" role="alert">
            {notice}
          </p>
        ) : null}

        {plans.length > 0 ? (
          <>
            <p className="text-ink-600 text-sm font-semibold">
              {filtered ? `Showing ${shown.length} of ${plans.length} meal plans` : `${plans.length} meal ${plans.length === 1 ? 'plan' : 'plans'}`}
            </p>
            {shown.length > 0 ? (
              <ul aria-label="Meal plans" className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {shown.map((plan) => (
                  <li className="min-w-0" key={plan.slug}>
                    <MealPlanCard plan={plan} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="bg-card mx-auto mt-6 max-w-[52ch] rounded-2xl p-8 text-center shadow-sm">
                <p className="text-body text-ink-900 font-semibold">{COPY.noMatch}</p>
                <div className="mt-5 flex justify-center">
                  <Cta href={filterHref({ audience: null, subcategory: null })} variant="secondary">
                    {COPY.showAll}
                  </Cta>
                </div>
              </div>
            )}
            <p className="text-ink-600 mt-8 text-sm">{COPY.family}</p>
          </>
        ) : (
          <div className="bg-card mx-auto mt-8 max-w-[52ch] rounded-2xl p-8 text-center shadow-sm">
            <h3 className="text-h3">Meal plans open soon</h3>
            <p className="text-body text-ink-600 mt-3">
              We are setting up the menus and prices. Message us and we will help you start.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {whatsapp ? (
                <Cta href={whatsappHref(whatsapp)} rel="noopener noreferrer" target="_blank" variant="primary">
                  <WhatsAppIcon className="size-4" />
                  Message us on WhatsApp
                </Cta>
              ) : null}
            </div>
          </div>
        )}

        <div className="border-line mt-10 border-t pt-6">
          <p className="text-body text-ink-600">
            {COPY.otherShelves}{' '}
            {(Object.keys(CATEGORY_LABEL) as Array<keyof typeof CATEGORY_LABEL>).map((value, index, all) => (
              <React.Fragment key={value}>
                <Link
                  className="text-green-700 font-bold underline hover:text-green-600 focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none"
                  href={productCategoryHref(value)}
                >
                  {CATEGORY_LABEL[value]}
                </Link>
                {index < all.length - 1 ? ' · ' : ''}
              </React.Fragment>
            ))}
          </p>
        </div>
      </Section>

      {plans.length > 0 ? (
        <Section tone="white">
          <div className="max-w-[52ch]">
            <h2 className="text-h2">{COPY.finalHeading}</h2>
            <p className="text-body text-ink-600 mt-3">{COPY.finalBody}</p>

            <div className="mt-8">
              {whatsapp ? (
                <Cta href={whatsappHref(whatsapp)} rel="noopener noreferrer" target="_blank" variant="primary">
                  <WhatsAppIcon className="size-4" />
                  {PRODUCTS_CTA_MESSAGE}
                </Cta>
              ) : (
                <Cta href="#meal-plans" variant="primary">
                  {COPY.browse}
                </Cta>
              )}
            </div>
          </div>
        </Section>
      ) : null}
    </main>
  )
}
