import { Phone } from 'lucide-react'
import React from 'react'

import type { Product } from '@/payload-types'
import type { ProductSize } from '@/utilities/cartLines'
import { formatPaise } from '@/utilities/money'
import { PRODUCT_PAUSED_INLINE } from '@/utilities/productPageCopy'
import { PRODUCT_START_DATE_NOTE } from '@/utilities/productsCopy'
import { productHref } from '@/utilities/productsCategoryCopy'

import { type ProductDuration, ProductPurchase } from '../ProductPurchase'
import { daysText } from './shared'

/**
 * The buy row: the purchase form while the product can be bought, otherwise
 * its sizes, price or durations read-only with the paused line under them.
 */
export const BuyPanel: React.FC<{
  buyableOneTime: boolean
  compareAt: null | number
  durations: ProductDuration[]
  isAvailable: boolean
  isPlan: boolean
  oneTimePrice: number
  product: Pick<Product, 'slug' | 'title' | 'type'>
  sizeOptions: ProductSize[]
  whatsapp?: null | string
}> = ({ buyableOneTime, compareAt, durations, isAvailable, isPlan, oneTimePrice, product, sizeOptions, whatsapp }) => (
  <section aria-label="Buy" className="border-line mt-5 border-t pt-5">
    {isAvailable && buyableOneTime ? (
      <ProductPurchase
        combo={product.type === 'combo'}
        compareAtPrice={compareAt}
        durations={[]}
        oneTimePrice={oneTimePrice}
        productSlug={product.slug}
        productTitle={product.title}
        returnPath={productHref(product.slug)}
        sizes={sizeOptions}
        whatsapp={whatsapp}
      />
    ) : isAvailable && isPlan && durations.length > 0 ? (
      <ProductPurchase
        durations={durations}
        productSlug={product.slug}
        productTitle={product.title}
        returnPath={productHref(product.slug)}
        whatsapp={whatsapp}
      />
    ) : (
      <div>
        {sizeOptions.length > 0 ? (
          <ul className="divide-line divide-y">
            {sizeOptions.map((size) => (
              <li
                className="flex items-center justify-between gap-4 py-3"
                key={size.label}
              >
                <p className="text-sm leading-tight font-bold">{size.label}</p>
                <p className="text-green-700 text-sm font-bold tabular-nums">
                  {formatPaise(size.price)}
                </p>
              </li>
            ))}
          </ul>
        ) : buyableOneTime ? (
          <p className="text-[30px] leading-none font-extrabold text-green-900 tabular-nums">
            {formatPaise(oneTimePrice)}
          </p>
        ) : (
          <ul className="divide-line divide-y">
            {durations.map((duration, index) => (
              <li
                className="flex items-center justify-between gap-4 py-3"
                key={`${duration.label}-${index}`}
              >
                <div>
                  <p className="text-sm leading-tight font-bold">{duration.label}</p>
                  <p className="text-caption text-ink-600 mt-0.5">
                    {daysText(duration.days)} of meals
                  </p>
                </div>
                <p className="text-green-700 text-sm font-bold tabular-nums">
                  {formatPaise(duration.price)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="text-ink-600 text-caption mt-3 leading-6">
          {PRODUCT_PAUSED_INLINE}
        </p>
      </div>
    )}

    {isPlan ? (
      <p className="text-ink-600 mt-3 flex items-start gap-2 text-sm leading-6">
        <Phone
          aria-hidden="true"
          className="mt-1 size-4 shrink-0 text-green-700"
          strokeWidth={2}
        />
        {PRODUCT_START_DATE_NOTE}
      </p>
    ) : null}
  </section>
)
