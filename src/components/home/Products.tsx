import React from 'react'

import { Cta } from '@/components/Cta'
import { ProductCard } from '@/components/Store/ProductCard'
import {
  PRODUCTS_SECTION_CTA,
  PRODUCTS_SECTION_HEADING,
  PRODUCTS_SECTION_INTRO,
} from '@/utilities/homeCopy'
import { getHomeProducts } from '@/utilities/products'

import { Section } from './Section'

/**
 * The products shelf, four at most (design.md §10.1).
 *
 * The cards are the ones `/products` uses, not a summary of them: photo, name,
 * the first duration's price and one Add to cart control, so someone who already
 * knows what they want buys from the front page and someone still comparing
 * follows the card to the product's own page. Prices come from the product
 * records through the same card, so there is no second place to keep them right.
 *
 * A kitchen with nothing open shows no shelf at all rather than an empty
 * heading.
 */
export const ProductShelf: React.FC = async () => {
  const products = await getHomeProducts()()

  if (products.length === 0) return null

  return (
    <Section id="products">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
        <div className="max-w-[58ch]">
          <h2 className="text-h2">{PRODUCTS_SECTION_HEADING}</h2>
          <p className="text-body text-ink-600 mt-4">{PRODUCTS_SECTION_INTRO}</p>
        </div>

        <Cta className="shrink-0" href="/products" variant="secondary">
          {PRODUCTS_SECTION_CTA}
        </Cta>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} returnPath="/" />
        ))}
      </div>
    </Section>
  )
}
