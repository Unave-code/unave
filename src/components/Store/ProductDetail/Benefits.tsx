import { Sparkle } from 'lucide-react'
import React from 'react'

import { Section } from '@/components/home/Section'
import type { Product } from '@/payload-types'
import { cn } from '@/utilities/ui'

type Benefit = NonNullable<Product['benefits']>[number]

/**
 * Columns for the number of benefits a product has (the admin allows one to
 * six), chosen so rows fill: one stands alone and centred, two and four pair up
 * (four runs four across on wide screens), and three, five and six run in threes.
 */
const columnsFor = (count: number): string => {
  if (count <= 1) return 'max-w-md text-center'
  if (count === 2) return 'max-w-4xl sm:grid-cols-2'
  if (count === 4) return 'max-w-6xl sm:grid-cols-2 lg:grid-cols-4'
  return 'max-w-6xl sm:grid-cols-2 lg:grid-cols-3'
}

/**
 * The product's benefits on the deep green band: a cream title with the
 * product's name in gold, then each benefit in cream type behind a thin gold
 * rule, led by a small gold sparkle. The band breaks the white page so the
 * benefits read as the product's feature moment. The sparkle and the rules are
 * decoration; the words carry the claim.
 */
export const Benefits: React.FC<{
  benefits: Benefit[]
  title: string
}> = ({ benefits, title }) => {
  const single = benefits.length <= 1

  return (
    <Section className="bg-green-900" tone="green">
      <h2 className="text-h2 text-cream text-center md:text-[28px]" id="product-benefits-heading">
        Benefits of <span className="text-gold-400 capitalize">{title}</span>
      </h2>

      <ul
        aria-labelledby="product-benefits-heading"
        className={cn('mx-auto mt-10 grid gap-x-10 gap-y-10 md:mt-14', columnsFor(benefits.length))}
      >
        {benefits.map((benefit, index) => (
          <li
            className={cn('min-w-0 border-t border-gold-400/35 pt-6', single && 'border-t-0 pt-0')}
            key={benefit.id ?? `${benefit.title}-${index}`}
          >
            <Sparkle
              aria-hidden="true"
              className={cn('text-gold-400 size-5', single && 'mx-auto')}
              fill="currentColor"
              strokeWidth={1.5}
            />
            <h3 className="text-cream mt-4 text-lg leading-snug font-extrabold text-balance">
              {benefit.title}
            </h3>
            {benefit.description ? (
              <p className="text-cream/80 mt-2 text-base leading-relaxed text-pretty">
                {benefit.description}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </Section>
  )
}
