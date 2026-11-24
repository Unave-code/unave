import { Check } from 'lucide-react'
import React from 'react'

import { Section } from '@/components/home/Section'
import type { Product } from '@/payload-types'
import { cn } from '@/utilities/ui'

type Benefit = NonNullable<Product['benefits']>[number]

/**
 * How wide each card runs for the number of benefits a product has (the admin
 * allows one to six). The cards wrap in a centred flex row, so a short last row
 * (five benefits) sits in the middle instead of hanging off the left. One card
 * stands alone, two and four pair up (four runs four across on wide screens),
 * and three, five and six run in threes.
 */
const layoutFor = (count: number): { list: string; card: string } => {
  if (count <= 1) return { card: 'w-full', list: 'max-w-md' }
  if (count === 2) return { card: 'w-full sm:w-[calc((100%-1.5rem)/2)]', list: 'max-w-3xl' }
  if (count === 4) {
    return {
      card: 'w-full sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-4.5rem)/4)]',
      list: 'max-w-6xl',
    }
  }
  return {
    card: 'w-full sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]',
    list: 'max-w-6xl',
  }
}

/**
 * The product's benefits as white cards on the tint band, under a centred
 * section title. Each card leads with a green check in a 44px chip, then the
 * benefit's title in green and, when the kitchen wrote one, a single plain line.
 * The check is decoration; the words carry the claim.
 */
export const Benefits: React.FC<{
  benefits: Benefit[]
  title: string
}> = ({ benefits, title }) => {
  const layout = layoutFor(benefits.length)

  return (
    <Section tone="tint">
      <h2 className="text-h2 text-center text-balance" id="product-benefits-heading">
        Benefits of <span className="capitalize">{title}</span>
      </h2>

      <ul
        aria-labelledby="product-benefits-heading"
        className={cn('mx-auto mt-10 flex flex-wrap justify-center gap-6 md:mt-12', layout.list)}
      >
        {benefits.map((benefit, index) => (
          <li
            className={cn('bg-card min-w-0 rounded-2xl p-6 shadow-sm sm:p-7', layout.card)}
            key={benefit.id ?? `${benefit.title}-${index}`}
          >
            <span
              aria-hidden="true"
              className="grid size-11 place-items-center rounded-full bg-green-100 text-green-700"
            >
              <Check className="size-5" strokeWidth={2.5} />
            </span>
            <h3 className="mt-5 text-lg leading-snug font-extrabold text-balance text-green-900">
              {benefit.title}
            </h3>
            {benefit.description ? (
              <p className="text-ink-600 mt-2 text-base leading-relaxed text-pretty">
                {benefit.description}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </Section>
  )
}
