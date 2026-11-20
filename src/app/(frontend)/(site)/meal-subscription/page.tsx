import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { ArrowRight, Moon, Sun, UtensilsCrossed } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { PRODUCT_PLACEHOLDER } from '@/components/Store/productPlaceholder'
import { Swoosh } from '@/components/Swoosh'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { formatPaise } from '@/utilities/money'
import {
  MEAL_PLANS_PATH,
  mealPlanPath,
  normalizeMealPlan,
  type PlanBuilderData,
  type PlanMenuMeal,
} from '@/utilities/planBuilder'
import { cn } from '@/utilities/ui'

export const metadata: Metadata = {
  alternates: { canonical: MEAL_PLANS_PATH },
  description: 'Weekly home-style meal plans. Pick a plan, see the menu, choose your options and pay securely.',
  title: 'Meal subscription',
}

const COPY = {
  heading: 'A fresh home-style menu',
  accent: 'every week',
  intro: 'Choose a meal plan, see what we are cooking, pick your options, then pay securely.',
  family: 'Feeding a family? Add more than one plan to your cart and pay for them together.',
}

const NOTICES: Record<string, string> = {
  changed: 'That meal plan changed or is no longer offered. Please pick one again.',
  unknown: 'That did not go through. Please try again.',
}

const MEALS_LABEL = { any: 'Lunch, dinner or both', dinner: 'Dinner only', lunch: 'Lunch only' } as const

const focusRing = 'focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:outline-none'

/** The cheapest way in: the price for one person and the length it buys. */
const cheapest = (plan: PlanBuilderData): null | { label: string; price: number } => {
  let best: null | { label: string; price: number } = null
  for (const length of plan.plans) {
    for (const price of Object.values(length.prices)) {
      if (price !== undefined && (!best || price < best.price)) best = { label: length.label, price }
    }
  }
  return best
}

/** Up to three dishes from this week, in day order, so a row shows real food. */
const tasting = (plan: PlanBuilderData): { dish: PlanMenuMeal; when: string }[] => {
  const out: { dish: PlanMenuMeal; when: string }[] = []
  for (const day of plan.thisWeek?.days ?? []) {
    if (plan.meals !== 'dinner' && day.lunch) out.push({ dish: day.lunch, when: `${day.day} lunch` })
    if (plan.meals !== 'lunch' && day.dinner) out.push({ dish: day.dinner, when: `${day.day} dinner` })
    if (out.length >= 3) break
  }
  return out.slice(0, 3)
}

/**
 * Every meal plan, one wide row each: the photo, who it is for, real dishes from
 * this week and the price to start. Staff manage plans under Catalogue → Meal
 * plans; shoppers can narrow the list by audience. A cart can hold several built
 * plans, so a family can mix them in one order.
 */
export default async function MealPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string; notice?: string }>
}) {
  const params = await searchParams
  const audienceSlug = typeof params.audience === 'string' ? params.audience.trim().slice(0, 80) : ''
  const payload = await getPayload({ config: configPromise })

  const all = await payload.find({ collection: 'meal-plans', depth: 1, limit: 50, sort: 'position' })
  const plans = all.docs.map((doc) => normalizeMealPlan(doc)).filter((plan) => plan.plans.length > 0)

  // Only audiences some plan uses become filters.
  const audiences = [...new Map(plans.filter((p) => p.audience?.slug).map((p) => [p.audience!.slug, p.audience!])).values()]
  const shown = audienceSlug ? plans.filter((p) => p.audience?.slug === audienceSlug) : plans
  const notice = params.notice ? (NOTICES[params.notice] ?? NOTICES.unknown) : null

  const chip = (label: string, href: string, active: boolean) => (
    <Link
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-pill inline-flex min-h-11 items-center border-2 px-5 text-sm font-bold transition-colors motion-reduce:transition-none',
        active ? 'border-green-700 bg-green-700 text-white' : 'border-line text-ink-900 bg-white hover:border-green-500',
        focusRing,
      )}
      href={href}
      key={href}
    >
      {label}
    </Link>
  )

  return (
    <main className="bg-cream">
      <section className="relative overflow-hidden bg-green-900 text-cream">
        <Swoosh className="-top-40 -right-32 w-[42rem] text-gold-400/[0.08]" />
        <div className="relative container py-12 md:py-20">
          <h1 className="text-hero max-w-[22ch] font-extrabold text-balance">
            {COPY.heading} <span className="text-gold-400 whitespace-nowrap italic">{COPY.accent}</span>
          </h1>
          <p className="text-lead text-cream/85 mt-5 max-w-[52ch]">{COPY.intro}</p>
          {plans.length > 0 && (
            <p className="text-cream/70 mt-8 text-sm">
              {plans.length} {plans.length === 1 ? 'plan' : 'plans'} to choose from · Delivered Monday to Saturday
            </p>
          )}
        </div>
      </section>

      <div className="container py-10 lg:py-16">
        {notice && (
          <p className="bg-gold-100 border-gold-300 text-ink-900 mb-8 rounded-2xl border px-5 py-4 text-base" role="alert">
            {notice}
          </p>
        )}

        {audiences.length > 1 && (
          <nav aria-label="Filter meal plans" className="mb-10 flex flex-wrap gap-2">
            {chip('All plans', MEAL_PLANS_PATH, !audienceSlug)}
            {audiences.map((a) => chip(a.title, `${MEAL_PLANS_PATH}?audience=${encodeURIComponent(a.slug)}`, audienceSlug === a.slug))}
          </nav>
        )}

        {shown.length === 0 ? (
          <div className="mx-auto max-w-[30rem] rounded-2xl bg-white p-10 text-center shadow-sm">
            <UtensilsCrossed aria-hidden className="mx-auto size-8 text-green-700" />
            <h2 className="text-ink-900 mt-4 text-xl font-extrabold">No meal plans here yet</h2>
            <p className="text-ink-600 mt-2">{audienceSlug ? 'Try all plans instead.' : 'Plans open soon. Message us and we will help you start.'}</p>
            {audienceSlug && (
              <Link className={cn('rounded-pill mt-6 inline-flex h-12 items-center bg-green-700 px-6 font-bold text-white hover:bg-green-600', focusRing)} href={MEAL_PLANS_PATH}>
                See all plans
              </Link>
            )}
          </div>
        ) : (
          <ol className="divide-line divide-y">
            {shown.map((plan, index) => {
              const from = cheapest(plan)
              const dishes = tasting(plan)
              const flip = index % 2 === 1
              const href = mealPlanPath(plan.slug)
              return (
                <li className="py-10 first:pt-0 last:pb-0 lg:py-14" key={plan.slug}>
                  <article
                    aria-labelledby={`plan-${plan.slug}`}
                    className="grid items-center gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14"
                  >
                    <Link
                      aria-hidden
                      className={cn(
                        'group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-green-100 shadow-md',
                        flip && 'md:order-2',
                      )}
                      href={href}
                      tabIndex={-1}
                    >
                      <Image
                        alt=""
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
                        fill
                        sizes="(min-width: 1024px) 45vw, (min-width: 768px) 45vw, 100vw"
                        src={plan.image ? getMediaUrl(plan.image.url) : PRODUCT_PLACEHOLDER}
                      />
                    </Link>

                    <div className="min-w-0">
                      <div className="text-ink-600 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                        {plan.audience?.title && (
                          <span className="rounded-pill bg-green-100 px-3 py-1 font-bold text-green-700">{plan.audience.title}</span>
                        )}
                        <span className="inline-flex items-center gap-1.5">
                          {plan.meals !== 'dinner' && <Sun aria-hidden className="text-gold-600 size-4" />}
                          {plan.meals !== 'lunch' && <Moon aria-hidden className="text-gold-600 size-4" />}
                          {MEALS_LABEL[plan.meals]}
                        </span>
                      </div>

                      <h2 className="mt-4 text-[28px] leading-tight font-extrabold text-green-900 md:text-[34px]" id={`plan-${plan.slug}`}>
                        <Link className={cn('rounded-sm hover:text-green-700', focusRing)} href={href}>
                          {plan.title}
                        </Link>
                      </h2>
                      {plan.description && <p className="text-ink-600 mt-3 max-w-[56ch] text-base leading-7">{plan.description}</p>}

                      {dishes.length > 0 && (
                        <div className="mt-6">
                          <h3 className="text-ink-900 text-sm font-bold">
                            On the menu this week{plan.thisWeek?.range ? ` · ${plan.thisWeek.range}` : ''}
                          </h3>
                          <ul className="mt-3 space-y-2.5">
                            {dishes.map(({ dish, when }) => (
                              <li className="flex items-baseline gap-3" key={when}>
                                <span className="text-ink-600 w-24 shrink-0 text-sm">{when}</span>
                                <span className="text-ink-900 min-w-0 font-bold">{dish.main}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
                        {from && (
                          <p>
                            <span className="block text-2xl font-extrabold text-green-700 tabular-nums">{formatPaise(from.price)}</span>
                            <span className="text-ink-600 text-sm">from, for one person, {from.label}</span>
                          </p>
                        )}
                        <Link
                          className={cn(
                            'rounded-pill text-button inline-flex h-13 items-center gap-2 bg-green-700 px-7 text-cream transition-colors hover:bg-green-600 motion-reduce:transition-none',
                            focusRing,
                          )}
                          href={href}
                        >
                          Choose this plan <ArrowRight aria-hidden className="size-4" />
                          <span className="sr-only">: {plan.title}</span>
                        </Link>
                      </div>
                      <p className="text-ink-600 mt-4 text-sm">
                        {plan.plans.map((l) => l.label).join(' · ')}
                        {plan.optionGroups.length > 0 && ` · Options: ${plan.optionGroups.map((g) => g.title).join(', ')}`}
                      </p>
                    </div>
                  </article>
                </li>
              )
            })}
          </ol>
        )}

        {shown.length > 0 && <p className="text-ink-600 border-line mt-14 border-t pt-8 text-center text-base">{COPY.family}</p>}
      </div>
    </main>
  )
}
