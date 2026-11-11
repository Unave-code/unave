import React from 'react'

import { Cta } from '@/components/Cta'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { ProductCard } from '@/components/Store/ProductCard'
import {
  HOME_HREF_CONTACT,
  PRODUCTS_SECTION_CTA,
  PRODUCTS_SECTION_EMPTY_BODY,
  PRODUCTS_SECTION_EMPTY_HEADING,
  PRODUCTS_SECTION_HEADING,
  PRODUCTS_SECTION_INTRO,
} from '@/utilities/homeCopy'
import { getHomeProducts } from '@/utilities/products'
import { WHATSAPP_CTA_LABEL, WHATSAPP_FALLBACK_LABEL, whatsappHref } from '@/utilities/whatsapp'

import { Section } from './Section'

/**
 * The products shelf, twelve at most (design.md §10.1): three rows of four on a
 * wide screen, two columns on tablet and phones.
 *
 * The cards are the ones `/products` uses, not a summary of them: photo-first,
 * the name and the cheapest per-day rate on a gradient band, and one Add to
 * cart control for the kitchen's default duration, so someone who already knows
 * what they want buys from the front page and someone still comparing follows
 * the card to the product's own page. Prices come from the product records
 * through the same card, so there is no second place to keep them right.
 *
 * A kitchen with nothing open shows a quiet empty card with a WhatsApp action
 * instead of disappearing: the shelf sits high on the page, right under the
 * trust strip, so a blank gap there would read as a broken site rather than a
 * kitchen between menus. The *See every product* link is dropped in that state,
 * because it would lead to a catalogue with nothing in it.
 */
export const ProductShelf: React.FC<{ whatsapp?: null | string }> = async ({ whatsapp }) => {
  const products = await getHomeProducts()()
  const hasProducts = products.length > 0

  return (
    <Section id="products">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
        <div className="max-w-[58ch]">
          <h2 className="text-h2">{PRODUCTS_SECTION_HEADING}</h2>
          <p className="text-body text-ink-600 mt-4">{PRODUCTS_SECTION_INTRO}</p>
        </div>

        {hasProducts ? (
          <Cta className="shrink-0" href="/products" variant="secondary">
            {PRODUCTS_SECTION_CTA}
          </Cta>
        ) : null}
      </div>

      {hasProducts ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} returnPath="/" />
          ))}
        </div>
      ) : (
        <div className="border-line bg-card mt-10 max-w-[52ch] rounded-2xl border p-8">
          <h3 className="text-h3">{PRODUCTS_SECTION_EMPTY_HEADING}</h3>
          <p className="text-body text-ink-600 mt-3">{PRODUCTS_SECTION_EMPTY_BODY}</p>

          {whatsapp ? (
            <div className="mt-6">
              <Cta
                href={whatsappHref(whatsapp)}
                rel="noopener noreferrer"
                target="_blank"
                variant="secondary"
              >
                <WhatsAppIcon className="size-4" />
                {WHATSAPP_CTA_LABEL}
              </Cta>
            </div>
          ) : (
            <div className="mt-6">
              <Cta href={HOME_HREF_CONTACT} variant="secondary">
                {WHATSAPP_FALLBACK_LABEL}
              </Cta>
            </div>
          )}
        </div>
      )}
    </Section>
  )
}
