import { ArrowRight, Moon, Sun } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { CTA_BASE, CTA_SIZES, CTA_VARIANTS } from '@/components/Cta'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { formatPaise } from '@/utilities/money'
import { mealPlanPath, type PlanBuilderData, type PlanSlot } from '@/utilities/planBuilder'
import { mealPlanLeadPrice } from '@/utilities/mealPlanShelf'
import { cn } from '@/utilities/ui'

import { PRODUCT_PLACEHOLDER } from './productPlaceholder'

const MEALS_LABEL = { any: 'Lunch or dinner', dinner: 'Dinner only', lunch: 'Lunch only' } as const

/**
 * One meal plan on the /meal-subscription shelf, built like the product card
 * (design.md §6.15) so the two shelves read as one shop: a square photo, a small
 * label, the name, one real dish from this week, the price it starts at and one
 * Choose plan button to its page, where it is built.
 */
export const MealPlanCard: React.FC<{
  /** The meals the shelf is filtered to, so the price shown matches. */
  meals?: null | PlanSlot
  plan: PlanBuilderData
  sizes?: string
}> = ({ meals = null, plan, sizes = '(min-width: 64rem) 25vw, (min-width: 48rem) 30vw, 45vw' }) => {
  const href = mealPlanPath(plan.slug)
  const price = mealPlanLeadPrice(plan, meals)
  const firstDay = plan.thisWeek?.days.find((day) => (plan.meals !== 'dinner' && day.lunch) || (plan.meals !== 'lunch' && day.dinner))
  const dish = firstDay ? (plan.meals !== 'dinner' ? firstDay.lunch : null) ?? firstDay.dinner : null

  return (
    <article className="group bg-card flex h-full flex-col overflow-hidden rounded-lg p-2 shadow-sm transition-[box-shadow,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Link aria-hidden="true" className="relative block aspect-square overflow-hidden rounded-md bg-green-50" href={href} tabIndex={-1}>
        <Image
          alt=""
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
          fill
          sizes={sizes}
          src={plan.image ? getMediaUrl(plan.image.url) : PRODUCT_PLACEHOLDER}
        />
        {plan.audience?.title ? (
          <span className="rounded-pill absolute top-2 left-2 inline-flex items-center bg-white/95 px-2.5 py-1 text-[11px] font-bold tracking-wide text-green-900 uppercase shadow-sm">
            {plan.audience.title}
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col px-2 pt-3 pb-1">
        <p className="text-ink-600 flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
          {plan.meals !== 'dinner' && <Sun aria-hidden="true" className="text-gold-600 size-3.5" />}
          {plan.meals !== 'lunch' && <Moon aria-hidden="true" className="text-gold-600 size-3.5" />}
          {MEALS_LABEL[plan.meals]}
        </p>

        <h3 className="text-body text-ink-900 mt-1 line-clamp-2 leading-snug font-semibold">
          <Link
            className="rounded-sm underline-offset-4 hover:text-green-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
            href={href}
          >
            {plan.title}
          </Link>
        </h3>

        {dish ? (
          <p className="text-ink-600 mt-1 line-clamp-2 text-xs leading-5">
            This week: {dish.main}
          </p>
        ) : plan.description ? (
          <p className="text-ink-600 mt-1 line-clamp-2 text-xs leading-5">{plan.description}</p>
        ) : null}

        <p className="text-ink-600 mt-1 line-clamp-1 text-xs">{plan.plans.map((length) => length.label).join(' · ')}</p>

        {price !== null ? (
          <p className="mt-2">
            <span className="text-body font-bold text-green-700 tabular-nums">From {formatPaise(price)}</span>
            <span className="text-ink-600 text-xs"> for one person</span>
          </p>
        ) : null}

        <div className="mt-auto pt-3">
          <Link
            aria-label={`Choose plan: ${plan.title}`}
            className={cn(CTA_BASE, CTA_SIZES.small, CTA_VARIANTS.primary, 'w-full px-1 text-xs uppercase')}
            href={href}
          >
            Choose plan
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </article>
  )
}
