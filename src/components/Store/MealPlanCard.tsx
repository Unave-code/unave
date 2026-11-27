import { ArrowRight, Moon, Sun, Sunrise } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { getMediaUrl } from '@/utilities/getMediaUrl'
import { MEAL_LABEL, mealPlanPath, offeredMeals, type PlanBuilderData } from '@/utilities/planBuilder'

import { CARD_ACTIONS, CARD_BODY, CARD_CTA, CARD_EYEBROW, CARD_FRAME, CARD_PHOTO_LINK, CARD_PHOTO_ZOOM, CARD_SUBLINE, CARD_TITLE, CARD_TITLE_LINK } from './cardStyles'
import { PRODUCT_PLACEHOLDER } from './productPlaceholder'

const MEAL_ICON = { breakfast: Sunrise, dinner: Moon, lunch: Sun } as const

/** "Lunch only", "Lunch or dinner", "Breakfast, lunch or dinner". */
const mealsLabel = (meals: string[]): string =>
  meals.length === 0
    ? ''
    : meals.length === 1
      ? `${meals[0]} only`
      : `${meals.slice(0, -1).join(', ')} or ${meals[meals.length - 1].toLowerCase()}`.replace(
          /, (\w)/g,
          (_, c: string) => `, ${c.toLowerCase()}`,
        )

/**
 * One meal plan on the /meal-subscription shelf, built like the product card
 * (design.md §6.15) so the two shelves read as one shop: a square photo, a small
 * label, the name, one real dish from this week and one Choose plan button to
 * its page, where it is built and priced. The card carries no price: a plan's
 * cost depends on the meals, length and people chosen on that page.
 */
export const MealPlanCard: React.FC<{
  plan: PlanBuilderData
  sizes?: string
}> = ({ plan, sizes = '(min-width: 64rem) 25vw, (min-width: 48rem) 30vw, 45vw' }) => {
  const href = mealPlanPath(plan.slug)
  const offered = offeredMeals(plan)
  // One real dish from this week, lunch first since it is the meal most plans lead with.
  const order = (['lunch', 'dinner', 'breakfast'] as const).filter((m) => offered.includes(m))
  const dish =
    plan.thisWeek?.days.flatMap((day) => order.flatMap((m) => (day[m] ? [day[m]] : [])))[0] ?? null

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
          {offered.map((m) => {
            const Icon = MEAL_ICON[m]
            return <Icon aria-hidden="true" className="text-gold-600 size-3.5" key={m} />
          })}
          {mealsLabel(offered.map((m) => MEAL_LABEL[m]))}
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
