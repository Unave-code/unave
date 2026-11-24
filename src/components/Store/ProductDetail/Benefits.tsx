import React from 'react'

import { Section } from '@/components/home/Section'
import type { Product } from '@/payload-types'
import { cn } from '@/utilities/ui'

type Benefit = NonNullable<Product['benefits']>[number]

/**
 * How the panel lays out for the number of benefits a product has (the admin
 * allows one to six). Each count gets columns that fill its rows: one sits alone
 * in a narrow panel, two and four pair up, three, five and six run in threes,
 * and four goes four across on wide screens.
 */
const layoutFor = (count: number): { panel: string; list: string } => {
  if (count <= 1) return { panel: 'max-w-md text-center', list: '' }
  if (count === 2) return { panel: 'max-w-3xl', list: 'sm:grid-cols-2' }
  if (count === 4) return { panel: 'max-w-6xl', list: 'sm:grid-cols-2 lg:grid-cols-4' }
  return { panel: 'max-w-6xl', list: 'sm:grid-cols-2 lg:grid-cols-3' }
}

/**
 * The product's benefits, gathered in one cream panel under a centred section
 * title. Each benefit is a short gold bar, its title in green and, when the
 * kitchen wrote one, a single plain line. The panel is one surface, not a row
 * of cards, so the benefits read as one list about one product.
 */
export const Benefits: React.FC<{
  benefits: Benefit[]
  title: string
}> = ({ benefits, title }) => {
  const layout = layoutFor(benefits.length)

  return (
    <Section className="pt-2 pb-14 md:pt-4 md:pb-20" tone="white">
      <div className="text-center">
        <h2 className="text-h2" id="product-benefits-heading">
          Benefits of <span className="capitalize">{title}</span>
        </h2>
      </div>

      <div className={cn('bg-background mx-auto mt-10 rounded-2xl px-6 py-8 sm:px-10 sm:py-10', layout.panel)}>
        <ul aria-labelledby="product-benefits-heading" className={cn('grid gap-x-10 gap-y-8', layout.list)}>
          {benefits.map((benefit, index) => (
            <li className="min-w-0" key={benefit.id ?? `${benefit.title}-${index}`}>
              <span
                aria-hidden="true"
                className={cn('bg-gold-400 block h-1 w-8 rounded-full', benefits.length === 1 && 'mx-auto')}
              />
              <h3 className="mt-4 text-lg leading-snug font-extrabold text-balance text-green-900">{benefit.title}</h3>
              {benefit.description ? (
                <p className="text-ink-600 mt-1.5 max-w-[38ch] text-base leading-relaxed text-pretty in-[.text-center]:mx-auto">
                  {benefit.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
