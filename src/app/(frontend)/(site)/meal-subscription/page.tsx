import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { CategoryTiles, type CategoryTile } from '@/components/CategoryTiles'
import { Cta } from '@/components/Cta'
import { Section } from '@/components/home/Section'
import { MealPlanCard } from '@/components/Store/MealPlanCard'
import { Swoosh } from '@/components/Swoosh'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import type { Footer, Media as MediaDoc } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { EMPTY_MEAL_PLAN_SHELF, mealPlanShelfHref, parseMealPlanShelf, type MealPlanSearchParams } from '@/utilities/mealPlanShelf'
import { MEAL_PLANS_PATH, normalizeMealPlan } from '@/utilities/planBuilder'
import { whatsappHref } from '@/utilities/whatsapp'

export const dynamic = 'force-dynamic'

const COPY = {
  heading: 'A fresh home-style menu',
  accent: 'every week',
  intro: 'Choose a meal plan, see what we are cooking this week, pick your options, then pay securely.',
  browse: 'Browse the meal plans',
  family: 'Feeding a family? Add more than one plan to your cart and pay for them together.',
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
 * Every meal plan as a shelf, built like /products (design.md §6.15, §6.19): the
 * green opening band, audience tiles like a category page's subcategories
 * (`?audience=` in the address, "All" clears it), the card grid and an honest
 * empty state.
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
  const photos = new Map(all.docs.map((doc) => [doc.slug, doc.image && typeof doc.image === 'object' ? doc.image : null]))

  /* One tile per audience some plan is for, in plan order, each showing the
     photo of its first plan. An audience no plan uses is ignored, so a stale
     link shows every plan rather than none. */
  const audienceMap = new Map<string, { image: MediaDoc | null; slug: string; title: string }>()
  for (const plan of plans) {
    if (plan.audience?.slug && !audienceMap.has(plan.audience.slug)) {
      audienceMap.set(plan.audience.slug, { image: photos.get(plan.slug) ?? null, slug: plan.audience.slug, title: plan.audience.title })
    }
  }
  const audiences = [...audienceMap.values()]
  const asked = parseMealPlanShelf(raw).audience
  const audience = audiences.some((item) => item.slug === asked) ? asked : null
  const shown = audience ? plans.filter((plan) => plan.audience?.slug === audience) : plans
  const tiles: CategoryTile[] =
    audiences.length > 1
      ? [
          { category: 'ready-to-eat', current: !audience, href: `${MEAL_PLANS_PATH}#meal-plans`, key: 'all', title: 'All' },
          ...audiences.map((item) => ({
            current: audience === item.slug,
            href: `${mealPlanShelfHref(MEAL_PLANS_PATH, { ...EMPTY_MEAL_PLAN_SHELF, audience: item.slug })}#meal-plans`,
            image: item.image ?? null,
            key: item.slug,
            title: item.title,
          })),
        ]
      : []

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

      <Section id="meal-plans" tone="white">
        <h2 className="sr-only">Meal plans</h2>
        <CategoryTiles className="mb-8 px-6 md:mb-10" label="Meal plans by who they are for" noun="meal plans" tiles={tiles} />

        {notice ? (
          <p className="bg-gold-100 border-gold-300 text-ink-900 mt-6 rounded-2xl border px-5 py-4 text-base" role="alert">
            {notice}
          </p>
        ) : null}

        {plans.length > 0 ? (
          <>
            <p className="text-ink-600 text-sm font-semibold">
              {audience ? `Showing ${shown.length} of ${plans.length} meal plans` : `${plans.length} meal ${plans.length === 1 ? 'plan' : 'plans'}`}
            </p>
            <ul aria-label="Meal plans" className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {shown.map((plan) => (
                <li className="min-w-0" key={plan.slug}>
                  <MealPlanCard plan={plan} />
                </li>
              ))}
            </ul>
            <p className="text-ink-600 mt-8 text-sm">{COPY.family}</p>
          </>
        ) : (
          <div className="border-line mx-auto mt-8 max-w-[52ch] rounded-2xl border p-8 text-center">
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
      </Section>
    </main>
  )
}
