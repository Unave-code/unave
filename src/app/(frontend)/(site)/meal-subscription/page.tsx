import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { ArrowRight, Moon, Sun, UtensilsCrossed } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { PRODUCT_PLACEHOLDER } from '@/components/Store/productPlaceholder'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { formatPaise } from '@/utilities/money'
import {
  fromPrice,
  MEAL_PLANS_PATH,
  mealPlanPath,
  normalizeMealPlan,
  normalizePlanSettings,
} from '@/utilities/planBuilder'
import { cn } from '@/utilities/ui'

export const metadata: Metadata = {
  alternates: { canonical: MEAL_PLANS_PATH },
  description: 'Weekly home-style meal plans. Pick a plan, see the menu, choose your options and pay securely.',
  title: 'Meal subscription',
}

const NOTICES: Record<string, string> = {
  changed: 'That meal plan changed or is no longer offered. Please pick one again.',
  unknown: 'That did not go through. Please try again.',
}

const MEALS_LABEL = { any: 'Lunch, dinner or both', dinner: 'Dinner only', lunch: 'Lunch only' } as const

const focusRing = 'focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:outline-none'

/**
 * Every meal plan, as cards. Staff manage them under Catalogue → Meal plans;
 * shoppers can narrow the list by audience, as on the products page. A cart can
 * hold several built plans, so a family can mix them in one order.
 */
export default async function MealPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string; notice?: string }>
}) {
  const params = await searchParams
  const audienceSlug = typeof params.audience === 'string' ? params.audience.trim().slice(0, 80) : ''
  const payload = await getPayload({ config: configPromise })

  const [settingsDoc, all] = await Promise.all([
    getCachedGlobal('plan-builder', 0)(),
    payload.find({ collection: 'meal-plans', depth: 1, limit: 50, sort: 'position' }),
  ])
  const settings = normalizePlanSettings(settingsDoc)
  const plans = all.docs.map((doc) => normalizeMealPlan(doc, settings)).filter((plan) => plan.plans.length > 0)

  // Only audiences some plan uses become filters.
  const audiences = [...new Map(plans.filter((p) => p.audience?.slug).map((p) => [p.audience!.slug, p.audience!])).values()]
  const shown = audienceSlug ? plans.filter((p) => p.audience?.slug === audienceSlug) : plans
  const notice = params.notice ? (NOTICES[params.notice] ?? NOTICES.unknown) : null

  const chip = (label: string, href: string, active: boolean) => (
    <Link
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-pill inline-flex min-h-11 items-center border-2 px-4 text-sm font-bold transition-colors motion-reduce:transition-none',
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
      <section className="bg-green-900 text-cream">
        <div className="container py-10 md:py-14">
          {settings.copy.eyebrow && <p className="text-eyebrow text-gold-400 uppercase">{settings.copy.eyebrow}</p>}
          {settings.copy.heading && (
            <h1 className="text-hero mt-3 max-w-[24ch] font-extrabold text-balance">{settings.copy.heading}</h1>
          )}
          {settings.copy.intro && <p className="text-lead text-cream/85 mt-3 max-w-[56ch]">{settings.copy.intro}</p>}
        </div>
      </section>

      <div className="container py-8 lg:py-12">
        {notice && (
          <p className="bg-gold-100 border-gold-300 text-ink-900 mb-6 rounded-2xl border px-5 py-4 text-sm" role="alert">
            {notice}
          </p>
        )}

        {audiences.length > 1 && (
          <nav aria-label="Filter meal plans" className="mb-6 flex flex-wrap gap-2">
            {chip('All plans', MEAL_PLANS_PATH, !audienceSlug)}
            {audiences.map((a) => chip(a.title, `${MEAL_PLANS_PATH}?audience=${encodeURIComponent(a.slug)}`, audienceSlug === a.slug))}
          </nav>
        )}

        {shown.length === 0 ? (
          <div className="bg-card mx-auto max-w-[30rem] rounded-2xl p-10 text-center shadow-sm">
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
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((plan) => {
              const from = fromPrice(plan)
              return (
                <li className="border-line flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm" key={plan.slug}>
                  <div className="relative aspect-[4/3] bg-green-50">
                    <Image
                      alt={plan.image?.alt ?? ''}
                      className="object-cover"
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      src={plan.image ? getMediaUrl(plan.image.url) : PRODUCT_PLACEHOLDER}
                    />
                    {plan.audience?.title && (
                      <span className="rounded-pill text-ink-900 absolute top-3 left-3 bg-white/95 px-3 py-1 text-xs font-bold shadow-sm">
                        {plan.audience.title}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="text-ink-900 text-lg font-extrabold">{plan.title}</h2>
                    <p className="text-ink-600 mt-1 flex items-center gap-1.5 text-sm">
                      {plan.meals !== 'dinner' && <Sun aria-hidden className="text-gold-600 size-4" />}
                      {plan.meals !== 'lunch' && <Moon aria-hidden className="text-gold-600 size-4" />}
                      {MEALS_LABEL[plan.meals]}
                    </p>
                    {plan.description && <p className="text-ink-600 mt-3 text-sm leading-6">{plan.description}</p>}
                    <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                      {from !== null && (
                        <p className="text-sm">
                          <span className="text-ink-600 block text-xs">From, per person</span>
                          <span className="text-lg font-extrabold text-green-700">{formatPaise(from)}</span>
                        </p>
                      )}
                      <Link
                        className={cn('rounded-pill inline-flex h-11 items-center gap-2 bg-green-700 px-5 text-sm font-bold text-white hover:bg-green-600', focusRing)}
                        href={mealPlanPath(plan.slug)}
                      >
                        Build this plan <ArrowRight aria-hidden className="size-4" />
                      </Link>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <p className="text-ink-600 mt-8 text-center text-sm">
          Feeding a family? Add more than one plan to your cart and pay for them together.
        </p>
      </div>
    </main>
  )
}
