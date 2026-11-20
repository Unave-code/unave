import { ArrowRight, Moon, Sun } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { getMediaUrl } from '@/utilities/getMediaUrl'
import { formatPaise } from '@/utilities/money'
import { mealPlanPath, type PlanBuilderData, type PlanSlot } from '@/utilities/planBuilder'
import { mealPlanLeadPrice } from '@/utilities/mealPlanShelf'

import { CARD_ACTIONS, CARD_BODY, CARD_CTA, CARD_EYEBROW, CARD_FRAME, CARD_PHOTO_LINK, CARD_PHOTO_ZOOM, CARD_PRICE, CARD_SUBLINE, CARD_TITLE, CARD_TITLE_LINK } from './cardStyles'
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
    <article className={CARD_FRAME}>
      <Link aria-hidden="true" className={CARD_PHOTO_LINK} href={href} tabIndex={-1}>
        <Image
          alt=""
          className={CARD_PHOTO_ZOOM}
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

      <div className={CARD_BODY}>
        <p className={CARD_EYEBROW}>
          {plan.meals !== 'dinner' && <Sun aria-hidden="true" className="text-gold-600 size-3.5" />}
          {plan.meals !== 'lunch' && <Moon aria-hidden="true" className="text-gold-600 size-3.5" />}
          {MEALS_LABEL[plan.meals]}
        </p>

        <h3 className={CARD_TITLE}>
          <Link
            className={CARD_TITLE_LINK}
            href={href}
          >
            {plan.title}
          </Link>
        </h3>

        {dish ? (
          <p className={CARD_SUBLINE}>
            This week: {dish.main}
          </p>
        ) : plan.description ? (
          <p className={CARD_SUBLINE}>{plan.description}</p>
        ) : null}

        <p className="text-ink-600 mt-1 line-clamp-1 text-xs">{plan.plans.map((length) => length.label).join(' · ')}</p>

        {price !== null ? (
          <p className="mt-2">
            <span className={CARD_PRICE}>From {formatPaise(price)}</span>
            <span className="text-ink-600 text-xs"> for one person</span>
          </p>
        ) : null}

        <div className={CARD_ACTIONS}>
          <Link
            aria-label={`Choose plan: ${plan.title}`}
            className={CARD_CTA}
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
