import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { Cta } from '@/components/Cta'
import { Section } from '@/components/home/Section'
import { MealPlanCard } from '@/components/Store/MealPlanCard'
import { MealPlanShelfControls } from '@/components/Store/MealPlanShelfControls'
import { Swoosh } from '@/components/Swoosh'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import type { Footer } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'
import {
  filterMealPlans,
  hasMealPlanFilters,
  type MealPlanSearchParams,
  parseMealPlanShelf,
} from '@/utilities/mealPlanShelf'
import { MEAL_PLANS_PATH, normalizeMealPlan } from '@/utilities/planBuilder'
import { whatsappHref } from '@/utilities/whatsapp'

export const dynamic = 'force-dynamic'

const COPY = {
  heading: 'A fresh home-style menu',
  accent: 'every week',
  intro: 'Choose a meal plan, see what we are cooking this week, pick your options, then pay securely.',
  browse: 'Browse the meal plans',
  gridHeading: 'Every meal plan',
  gridIntro: 'Each plan has its own weekly menu, lengths and prices. Search for a dish, or narrow the shelf by who it is for and which meals you want.',
  howHeading: 'How a meal plan works',
  howIntro: 'Pick once, and the kitchen cooks for you every delivery day.',
  family: 'Feeding a family? Add more than one plan to your cart and pay for them together.',
}

const HOW_STEPS = [
  { body: 'Open a plan to see this week’s lunch and dinner, day by day.', title: 'See the menu' },
  { body: 'Choose lunch, dinner or both, how long, how many people and any options.', title: 'Build your plan' },
  { body: 'Pay securely at checkout. We call you to confirm your start date.', title: 'Pay and start' },
]

const NOTICES: Record<string, string> = {
  changed: 'That meal plan changed or is no longer offered. Please pick one again.',
  unknown: 'That did not go through. Please try again.',
}

const STEP_NUMBER = 'bg-green-100 text-green-700 grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold'

export async function generateMetadata({ searchParams }: { searchParams: Promise<MealPlanSearchParams> }): Promise<Metadata> {
  const state = parseMealPlanShelf(await searchParams)
  return {
    alternates: { canonical: MEAL_PLANS_PATH },
    description: 'Weekly home-style meal plans. Pick a plan, see the menu, choose your options and pay securely.',
    // A filtered view is not a page of its own.
    robots: hasMealPlanFilters(state) ? { follow: true, index: false } : undefined,
    title: 'Meal subscription',
  }
}

/**
 * Every meal plan as a shelf, built like /products (design.md §6.15, §6.19): the
 * green opening band, a search and filter bar whose state lives in the address,
 * the card grid, two honest empty states and a how-it-works band.
 */
export default async function MealPlansPage({ searchParams }: { searchParams: Promise<MealPlanSearchParams> }) {
  const raw = await searchParams
  const state = parseMealPlanShelf(raw)
  const noticeKey = typeof raw.notice === 'string' ? raw.notice : null
  const notice = noticeKey ? (NOTICES[noticeKey] ?? NOTICES.unknown) : null

  const payload = await getPayload({ config: configPromise })
  const [all, footer] = await Promise.all([
    payload.find({ collection: 'meal-plans', depth: 1, limit: 100, sort: 'position' }),
    getCachedGlobal('footer', 1)() as Promise<Footer | null>,
  ])
  const whatsapp = footer?.contact?.whatsapp ?? null

  const plans = all.docs.map((doc) => normalizeMealPlan(doc)).filter((plan) => plan.plans.length > 0)
  const shown = filterMealPlans(plans, state)
  const filtered = hasMealPlanFilters(state)

  // Only audiences some plan uses become choices.
  const audiences = [
    ...new Map(plans.filter((p) => p.audience?.slug).map((p) => [p.audience!.slug, { label: p.audience!.title, value: p.audience!.slug }])).values(),
  ]

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
        <h2 className="text-h2">{COPY.gridHeading}</h2>
        <p className="text-body text-ink-600 mt-3 max-w-[60ch]">{COPY.gridIntro}</p>

        {notice ? (
          <p className="bg-gold-100 border-gold-300 text-ink-900 mt-6 rounded-2xl border px-5 py-4 text-base" role="alert">
            {notice}
          </p>
        ) : null}

        {plans.length > 0 ? <MealPlanShelfControls audiences={audiences} basePath={MEAL_PLANS_PATH} state={state} /> : null}

        {shown.length > 0 ? (
          <>
            <p className="text-ink-600 mt-6 text-sm font-semibold">
              {filtered ? `Showing ${shown.length} of ${plans.length} meal plans` : `${plans.length} meal ${plans.length === 1 ? 'plan' : 'plans'}`}
            </p>
            <ul aria-label="Meal plans" className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {shown.map((plan) => (
                <li className="min-w-0" key={plan.slug}>
                  <MealPlanCard meals={state.meals} plan={plan} />
                </li>
              ))}
            </ul>
            <p className="text-ink-600 mt-8 text-sm">{COPY.family}</p>
          </>
        ) : (
          <div className="border-line mx-auto mt-8 max-w-[52ch] rounded-2xl border p-8 text-center">
            <h3 className="text-h3">{filtered ? 'Nothing matches those filters' : 'Meal plans open soon'}</h3>
            <p className="text-body text-ink-600 mt-3">
              {filtered
                ? 'Try fewer filters, or tell us what you are looking for and we will help.'
                : 'We are setting up the menus and prices. Message us and we will help you start.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {filtered ? (
                <Cta href={MEAL_PLANS_PATH} variant="secondary">
                  Clear all
                </Cta>
              ) : null}
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

      <Section tone="tint">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
          <div>
            <h2 className="text-h2">{COPY.howHeading}</h2>
            <p className="text-body text-ink-600 mt-3 max-w-[45ch]">{COPY.howIntro}</p>
          </div>
          <ol className="flex flex-col gap-8">
            {HOW_STEPS.map((step, index) => (
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
