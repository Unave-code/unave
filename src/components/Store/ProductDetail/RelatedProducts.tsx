import React from 'react'

import { Section } from '@/components/home/Section'
import type { Product } from '@/payload-types'
import { productHref } from '@/utilities/productsCategoryCopy'

import { ProductCard } from '../ProductCard'

/** People also bought: the rest of the same shelf, with its buy buttons. */
export const RelatedProducts: React.FC<{ productSlug: string; related: Product[] }> = ({ productSlug, related }) => (
  <Section tone="cream">
    <div className="text-center">
      <h2 className="text-h2" id="also-bought-heading">
        People also bought
      </h2>
    </div>

    <ul
      aria-labelledby="also-bought-heading"
      className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5"
    >
      {related.slice(0, 5).map((item) => (
        <li className="min-w-0" key={item.id}>
          <ProductCard
            product={item}
            returnPath={productHref(productSlug)}
            sizes="(min-width: 64rem) 20vw, (min-width: 48rem) 30vw, 45vw"
          />
        </li>
      ))}
    </ul>
  </Section>
)
