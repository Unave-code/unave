import { Check } from 'lucide-react'
import React from 'react'

import { Notice } from '@/components/Notice'
import RichText from '@/components/RichText'
import type { Product } from '@/payload-types'
import { PRODUCT_POINTS_HEADING } from '@/utilities/productPageCopy'
import { PRODUCTS_PAUSED_NOTE_BODY, PRODUCTS_PAUSED_NOTE_TITLE } from '@/utilities/productsCopy'

import { ColumnHeading } from './shared'

/**
 * Everything read under the buy row: what you get as a checklist, the key
 * facts, a plan's "How your plan works", then the description.
 */
export const ProductInfo: React.FC<{
  details: [string, string][]
  hasReading: boolean
  howItWorksSteps: string[]
  isAvailable: boolean
  isPlan: boolean
  points: string[]
  product: Pick<Product, 'description'>
}> = ({ details, hasReading, howItWorksSteps, isAvailable, isPlan, points, product }) => (
  <>
    {/* What you get, as a short checklist under the buy row. */}
    {points.length > 0 ? (
      <section
        aria-labelledby="product-points-heading"
        className="border-line mt-5 border-t pt-5"
      >
        <ColumnHeading id="product-points-heading">{PRODUCT_POINTS_HEADING}</ColumnHeading>
        <ul className="mt-3 flex flex-col gap-2">
          {points.map((point, index) => (
            <li className="flex items-start gap-2.5" key={`${point}-${index}`}>
              <Check
                aria-hidden="true"
                className="mt-1 size-4 shrink-0 text-green-700"
                strokeWidth={2.5}
              />
              <span className="text-ink-900 text-sm leading-6">{point}</span>
            </li>
          ))}
        </ul>
      </section>
    ) : null}

    {/* The key facts as a short list, read straight from the record. */}
    <section
      aria-labelledby="product-details-heading"
      className="border-line mt-5 border-t pt-5"
    >
      <h2 className="sr-only" id="product-details-heading">
        Product details
      </h2>
      <dl className="grid gap-y-2 text-sm">
        {details.map(([term, value]) => (
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3" key={term}>
            <dt className="text-ink-900 font-bold">{term}:</dt>
            <dd className="text-ink-600 wrap-anywhere">{value}</dd>
          </div>
        ))}
      </dl>
    </section>

    {/* A meal plan's "How your plan works": the plan's own text, or
        the shared text from Catalogue → Product page. */}
    {isPlan && howItWorksSteps.length > 0 ? (
      <section
        aria-labelledby="plan-how-heading"
        className="mt-6 rounded-lg border border-green-200 bg-green-50 p-5"
      >
        <ColumnHeading id="plan-how-heading">How your plan works</ColumnHeading>
        <ol className="mt-3 flex flex-col gap-3">
          {howItWorksSteps.map((step, index) => (
            <li className="flex items-start gap-3" key={`${index}-${step}`}>
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-700 text-xs font-bold text-white"
              >
                {index + 1}
              </span>
              <span className="text-ink-900 text-sm leading-6">{step}</span>
            </li>
          ))}
        </ol>
      </section>
    ) : null}

    {/* The description under the buy row and the facts, as a shop reads. */}
    {hasReading ? (
      <section
        aria-labelledby="product-description-heading"
        className="border-line mt-6 border-t pt-6"
      >
        <h2 className="text-body font-bold text-green-900" id="product-description-heading">
          Description
        </h2>
        {product.description ? (
          <RichText
            className="text-body text-ink-600 mx-0 mt-2 max-w-[68ch]"
            data={product.description}
            enableGutter={false}
          />
        ) : null}

        {!isAvailable ? (
          <Notice className="mt-6" title={PRODUCTS_PAUSED_NOTE_TITLE}>
            {PRODUCTS_PAUSED_NOTE_BODY}
          </Notice>
        ) : null}
      </section>
    ) : null}
  </>
)
