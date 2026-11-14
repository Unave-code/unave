import React from 'react'

import { Cta } from '@/components/Cta'
import { ProductCard } from '@/components/Store/ProductCard'
import { BEST_SELLERS_EMPTY, BEST_SELLERS_HEADING, BEST_SELLERS_INTRO } from '@/utilities/homeCopy'
import { getFeaturedHomeProducts } from '@/utilities/products'

import { Section } from './Section'

export const BestSellers: React.FC = async () => {
  const products = await getFeaturedHomeProducts()()

  return (
    <Section id="best-sellers" tone="tint">
      <h2 className="text-h2">{BEST_SELLERS_HEADING}</h2>
      <p className="text-body text-ink-600 mt-4 max-w-[65ch]">{BEST_SELLERS_INTRO}</p>

      {products.length > 0 ? (
        <ul
          aria-label="Best sellers"
          className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5"
        >
          {products.map((product) => (
            <li className="min-w-0" key={product.id}>
              <ProductCard product={product} returnPath="/" />
            </li>
          ))}
        </ul>
      ) : (
        <div className="border-line bg-card mt-10 max-w-[52ch] rounded-2xl border p-8">
          <p className="text-body text-ink-600">{BEST_SELLERS_EMPTY}</p>
          <div className="mt-6">
            <Cta href="/products" variant="secondary">
              See every product
            </Cta>
          </div>
        </div>
      )}
    </Section>
  )
}
