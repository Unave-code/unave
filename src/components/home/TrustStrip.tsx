import {
  BadgeCheck,
  CalendarDays,
  Leaf,
  PauseCircle,
  ShieldCheck,
  Truck,
  UtensilsCrossed,
} from 'lucide-react'
import React from 'react'

import { TRUST } from '@/utilities/homeCopy'

const TRUST_ICONS = {
  badge: BadgeCheck,
  calendar: CalendarDays,
  leaf: Leaf,
  pause: PauseCircle,
  shield: ShieldCheck,
  truck: Truck,
  utensils: UtensilsCrossed,
} as const

/**
 * The trust strip, drawn as one promise rail instead of a badge row: the claims
 * sit in a single line on a wide screen, separated by hairline rules, each
 * carried by a small icon inline with its label and, when one exists, a
 * specific note underneath. A claim with no note stands on its label alone, so
 * nothing here ever renders as a placeholder.
 */
export const TrustStrip: React.FC = () => (
  <section className="bg-green-50 border-line border-y">
    <ul className="container grid grid-cols-1 gap-x-6 gap-y-6 py-10 sm:grid-cols-2 md:py-12 lg:grid-cols-3 xl:grid-cols-5">
      {TRUST.map((item) => {
        const Icon = TRUST_ICONS[item.icon]

        return (
          <li
            className="xl:border-line xl:border-l xl:pl-6 xl:first:border-l-0 xl:first:pl-0"
            key={item.label}
          >
            <span className="text-caption text-ink-900 flex items-center gap-2 font-bold">
              <Icon
                aria-hidden="true"
                className="size-4.5 shrink-0 text-green-700"
                strokeWidth={2}
              />
              {item.label}
            </span>
            {item.note ? (
              <span className="text-caption text-ink-600 mt-1 block">{item.note}</span>
            ) : null}
          </li>
        )
      })}
    </ul>
  </section>
)
