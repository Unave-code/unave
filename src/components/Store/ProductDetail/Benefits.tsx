import React from 'react'

import { Section } from '@/components/home/Section'
import type { Product } from '@/payload-types'
import { cn } from '@/utilities/ui'

/**
 * A gold paint-brush stroke drawn behind each benefit: ragged top and
 * bottom edges, frayed ends and a few dry-brush streaks. It stretches to fit
 * its box; every other one is mirrored so neighbours do not look stamped.
 */
const BrushStroke: React.FC<{ flip?: boolean }> = ({ flip }) => (
  <svg
    aria-hidden="true"
    className={cn('absolute inset-0 -z-10 size-full text-gold-300', flip && '-scale-x-100')}
    preserveAspectRatio="none"
    viewBox="0 0 400 160"
  >
    <path
      d="M14 50 C34 34 70 27 112 28 C150 20 196 26 236 21 C282 16 330 22 362 24 C376 25 386 30 392 38 L384 44 L397 52 C390 66 396 82 388 96 L398 104 L386 112 C390 124 380 132 362 134 C322 140 282 134 240 139 C196 144 150 136 108 140 C70 143 40 138 20 130 L28 122 L8 114 C16 102 6 90 14 80 L4 72 L16 64 C10 58 10 54 14 50 Z"
      fill="currentColor"
    />
    <path
      d="M30 40 C120 30 260 28 380 33 L378 37 C260 33 120 35 32 44 Z"
      fill="currentColor"
      opacity="0.55"
    />
    <path
      d="M24 138 C110 146 270 144 372 138 L370 143 C270 150 110 151 26 143 Z"
      fill="currentColor"
      opacity="0.45"
    />
  </svg>
)

/** The product's benefits, each on a gold brush stroke. */
export const Benefits: React.FC<{
  benefits: NonNullable<Product['benefits']>
  title: string
}> = ({ benefits, title }) => (
  <Section className="py-0.5 md:py-0.5" tone="white">
    <div className="text-center">
      <h2 className="text-h2" id="product-benefits-heading">
        Benefits of <span className="capitalize">{title}</span>
      </h2>
    </div>
    <ul
      aria-labelledby="product-benefits-heading"
      className="mt-10 grid grid-cols-1 gap-6 min-[420px]:grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap lg:justify-center"
    >
      {benefits.map((benefit, index) => (
        <li
          className="relative isolate flex min-h-44 flex-col items-center justify-center gap-2 px-10 py-10 text-center lg:w-72"
          key={benefit.id ?? `${benefit.title}-${index}`}
        >
          <BrushStroke flip={index % 2 === 1} />
          <h3 className="text-lg font-extrabold text-green-900 capitalize md:text-xl">
            {benefit.title}
          </h3>
          {benefit.description ? (
            <p className="max-w-[28ch] text-base leading-6 text-green-800">
              {benefit.description}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  </Section>
)
