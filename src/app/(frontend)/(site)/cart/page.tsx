import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'

import { Cta } from '@/components/Cta'
import { CART_COOKIE, encodeCartLine, readCart } from '@/utilities/cart'
import { resolveCartLines } from '@/utilities/cartLines'
import {
  CART_CHECKOUT_CTA,
  CART_EMPTY_BODY,
  CART_EMPTY_CTA,
  CART_EMPTY_HEADING,
  CART_KEEP_BROWSING,
  CART_PAGE_DESCRIPTION,
  CART_PAGE_HEADING,
  CART_PAGE_INTRO,
  CART_PAGE_TITLE,
  CART_REMOVE,
  CART_STALE_LABEL,
  CART_STALE_NOTE,
  CART_SUMMARY_BODY,
  CART_SUMMARY_HEADING,
  CART_TOTAL,
  cartNotice,
} from '@/utilities/cartCopy'
import { formatPaise } from '@/utilities/money'

/**
 * The cart page (spec 0007, AC-3).
 *
 * Reads the cookie, resolves every line against the live product records, and
 * shows what the customer is about to pay. Prices and the total are computed
 * here on the server; the cookie carries identifiers only. A line whose product
 * left the menu, is paused, or lost its duration is listed with a marker,
 * excluded from the total, and can be removed with a plain form post, so the
 * page works without JavaScript.
 *
 * The page is deliberately out of search: it is personal and changes with the
 * cookie, so it is never indexed and never appears in the sitemap.
 */

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  description: CART_PAGE_DESCRIPTION,
  robots: { follow: false, index: false, nocache: true },
  title: CART_PAGE_TITLE,
}

type CartSearchParams = {
  notice?: string | string[]
}

const firstValue = (value?: string | string[]): string =>
  Array.isArray(value) ? (value[0] ?? '') : (value ?? '')

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<CartSearchParams>
}) {
  const params = await searchParams
  const notice = cartNotice(firstValue(params.notice))
  const cookieStore = await cookies()
  const lines = readCart(cookieStore.get(CART_COOKIE)?.value)

  const payload = await getPayload({ config: configPromise })
  const cart = await resolveCartLines({ lines, payload })

  return (
    <main className="container max-w-4xl py-16 sm:py-20">
      <header className="flex flex-col gap-2">
        <h1 className="text-h2">{CART_PAGE_HEADING}</h1>
        <p className="text-body text-ink-600">{CART_PAGE_INTRO}</p>
      </header>

      {notice ? (
        <p
          className="text-ink-900 rounded-lg bg-gold-100 mt-8 p-4 text-sm leading-6"
          role="status"
        >
          {notice}
        </p>
      ) : null}

      {cart.all.length === 0 ? (
        <div className="border-line mt-10 max-w-[52ch] rounded-2xl border p-8">
          <h2 className="text-h3">{CART_EMPTY_HEADING}</h2>
          <p className="text-body text-ink-600 mt-3">{CART_EMPTY_BODY}</p>

          <div className="mt-6">
            <Cta href="/products" variant="primary">
              {CART_EMPTY_CTA}
            </Cta>
          </div>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <section aria-label={CART_PAGE_TITLE} className="min-w-0">
            <ul className="border-line divide-line divide-y border-t">
              {cart.all.map((line) => (
                <li className="flex flex-wrap items-start justify-between gap-4 py-5" key={line.key}>
                  <div className="min-w-0">
                    <p className="text-base font-bold">{line.productTitle}</p>
                    <p className="text-ink-600 mt-1 text-sm">
                      {line.duration}
                      {line.days !== null
                        ? `, ${line.days} ${line.days === 1 ? 'day' : 'days'}`
                        : ''}
                    </p>

                    {line.stale ? (
                      <p className="text-gold-600 mt-2 text-sm font-semibold">
                        {CART_STALE_LABEL}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="text-sm font-bold">
                      {line.price !== null ? formatPaise(line.price) : '—'}
                    </p>

                    <form action="/api/cart/remove" className="contents" method="post">
                      <input name="line" type="hidden" value={encodeCartLine({ duration: line.duration, product: line.slug })} />
                      <input name="return" type="hidden" value="/cart" />

                      <button
                        aria-label={`Remove ${line.duration} of ${line.productTitle} from the cart`}
                        className="rounded-pill border-line text-green-700 hover:border-green-700 hover:bg-green-50 focus-visible:ring-green-500 inline-flex min-h-11 items-center border px-4 text-sm font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
                        type="submit"
                      >
                        {CART_REMOVE}
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>

            {cart.stale.length > 0 ? (
              <p className="text-ink-600 mt-4 text-sm leading-6">{CART_STALE_NOTE}</p>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
              <p className="font-bold">{CART_TOTAL}</p>
              <p className="text-green-700 text-lg font-bold">{formatPaise(cart.total)}</p>
            </div>

            {cart.usable.length > 0 && cart.stale.length === 0 ? (
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Cta href="/checkout" variant="primary">
                  {CART_CHECKOUT_CTA}
                </Cta>

                <Link
                  className="text-green-700 hover:opacity-75 text-sm font-semibold underline transition-opacity focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none motion-reduce:transition-none"
                  href="/products"
                >
                  {CART_KEEP_BROWSING}
                </Link>
              </div>
            ) : null}
          </section>

          <aside className="border-line rounded-2xl border bg-white p-6 sm:p-8">
            <h2 className="text-h3">{CART_SUMMARY_HEADING}</h2>

            <p className="text-h2 text-green-700 mt-3">{formatPaise(cart.total)}</p>

            <p className="text-ink-600 mt-3 text-sm leading-6">{CART_SUMMARY_BODY}</p>
          </aside>
        </div>
      )}
    </main>
  )
}
