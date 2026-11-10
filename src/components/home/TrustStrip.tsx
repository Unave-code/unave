import { BadgeCheck, Leaf, ShieldCheck, Truck, UtensilsCrossed } from 'lucide-react'
import React from 'react'

import { TRUST } from '@/utilities/homeCopy'

const TRUST_ICONS = {
  badge: BadgeCheck,
  leaf: Leaf,
  shield: ShieldCheck,
  truck: Truck,
  utensils: UtensilsCrossed,
} as const

/**
 * The trust strip, drawn as one promise rail instead of a badge row (design.md
 * §6.18): the claims sit in a single line on a wide screen, separated by hairline
 * rules, with one column on mobile and two or three as space allows.
 *
 * Each claim opens with a soft green chip holding its icon, with the bold label
 * centred beside it and its specific note underneath. The note indents to sit
 * under its label until the widest rail, where it takes the column's full width
 * so a long note never breaks mid-phrase. A claim with no note — the FSSAI
 * licence, until its number arrives — stands on its label alone, so nothing here
 * ever renders as a placeholder.
 */
export const TrustStrip: React.FC = () => (
  <section className="bg-green-50 border-line border-y">
    <ul className="container grid grid-cols-1 gap-x-6 gap-y-7 py-10 sm:grid-cols-2 md:py-12 lg:grid-cols-3 xl:grid-cols-5 xl:gap-x-0">
      {TRUST.map((item) => {
        const Icon = TRUST_ICONS[item.icon]

        return (
          <li
            className="xl:border-line xl:border-l xl:pl-6 xl:first:border-l-0 xl:first:pl-0"
            key={item.label}
          >
            <div className="flex items-start gap-3">
              <span className="bg-green-100 text-green-700 grid size-10 shrink-0 place-items-center rounded-full">
                <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
              </span>

              <span className="text-caption text-ink-900 pt-2.5 font-bold">{item.label}</span>
            </div>

            {item.note ? (
              <span className="text-caption text-ink-600 mt-1 block pl-[3.25rem] xl:pl-0">
                {item.note}
              </span>
            ) : null}
          </li>
        )
      })}
    </ul>
  </section>
)
