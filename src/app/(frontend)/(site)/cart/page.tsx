import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { Cta } from '@/components/Cta'
import { CheckoutSteps } from '@/components/Store/CheckoutSteps'
import { PRODUCT_PLACEHOLDER } from '@/components/Store/productPlaceholder'
import { CART_COOKIE, CART_MAX_QTY, encodeCartLine, readCart } from '@/utilities/cart'
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
  CART_QUANTITY_ADD_ONE,
  CART_QUANTITY_LABEL,
  CART_QUANTITY_REMOVE_ONE,
  CART_REMOVE,
  CART_STALE_LABEL,
  CART_STALE_NOTE,
  CART_SUMMARY_BODY,
  CART_SUMMARY_HEADING,
  CART_TOTAL,
  cartNotice,
} from '@/utilities/cartCopy'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { formatPaise } from '@/utilities/money'
import { productHref } from '@/utilities/productsCategoryCopy'
import { PRODUCT_ONE_TIME_LABEL } from '@/utilities/productsCopy'
import { cn } from '@/utilities/ui'

/** The quantity stepper's two halves, inside one outlined pill. */
const STEPPER_BUTTON =
  'text-green-700 hover:bg-green-50 focus-visible:ring-green-500 inline-flex size-11 items-center justify-center rounded-pill transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent motion-reduce:transition-none'

/**
 * The cart page (spec 0007, AC-3), step one of three.
 *
 * Lines sit in one white card, each with the product's photo (the branded
 * placeholder when it has none), its name linking back to its page, what was
 * chosen, a single outlined - qty + stepper for flat-price lines, and a quiet
 * Remove that warms to red on hover. Beside them, pinned on a wide screen, the
 * summary card holds the item count, the total and the one primary action,
 * Go to checkout, so the page never shows two totals or two ways on.
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

  const itemCount = cart.usable.reduce((sum, line) => sum + line.qty, 0)

  return (
    <main className="container max-w-6xl py-10 sm:py-14">
      <CheckoutSteps current={0} />

      <header className="mt-8 flex flex-col gap-2">
        <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.01em] text-green-900 md:text-[34px]">
          {CART_PAGE_HEADING}
        </h1>
        <p className="text-body text-ink-600 max-w-[65ch]">{CART_PAGE_INTRO}</p>
      </header>

      {notice ? (
        <p className="text-ink-900 bg-gold-100 mt-8 rounded-sm p-4 text-sm leading-6" role="status">
          {notice}
        </p>
      ) : null}

      {cart.all.length === 0 ? (
        <div className="bg-card mx-auto mt-12 flex max-w-[30rem] flex-col items-center rounded-2xl p-10 text-center shadow-sm">
          <span
            aria-hidden="true"
            className="grid size-16 place-items-center rounded-full bg-green-50 text-green-700"
          >
            <ShoppingBag className="size-7" strokeWidth={1.75} />
          </span>
          <h2 className="mt-5 text-xl font-bold text-green-900">{CART_EMPTY_HEADING}</h2>
          <p className="text-body text-ink-600 mt-2">{CART_EMPTY_BODY}</p>

          <div className="mt-6">
            <Cta href="/products" variant="primary">
              {CART_EMPTY_CTA}
            </Cta>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
          <section aria-label={CART_PAGE_TITLE} className="min-w-0">
            <ul className="bg-card divide-line divide-y overflow-hidden rounded-2xl shadow-sm">
              {cart.all.map((line) => (
                <li
                  className={cn('flex gap-4 p-4 sm:gap-5 sm:p-5', line.stale && 'bg-gold-100/50')}
                  key={line.key}
                >
                  <Link
                    aria-hidden="true"
                    className="relative size-20 shrink-0 overflow-hidden rounded-md bg-green-50 sm:size-24"
                    href={productHref(line.slug)}
                    tabIndex={-1}
                  >
                    <Image
                      alt=""
                      className="object-cover"
                      fill
                      sizes="96px"
                      src={line.image ? getMediaUrl(line.image.url) : PRODUCT_PLACEHOLDER}
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <Link
                        className="text-ink-900 rounded-sm text-base font-bold underline-offset-4 hover:text-green-800 hover:underline focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none"
                        href={productHref(line.slug)}
                      >
                        {line.productTitle}
                      </Link>
                      <p className="text-ink-600 mt-1 text-sm">
                        {line.type === 'combo'
                          ? 'Meal combo'
                          : line.type === 'one-time'
                            ? line.size
                              ? `${PRODUCT_ONE_TIME_LABEL} · ${line.size}`
                              : PRODUCT_ONE_TIME_LABEL
                            : line.duration}
                        {line.days !== null && line.days > 0
                          ? `, ${line.days} ${line.days === 1 ? 'day' : 'days'}`
                          : ''}
                      </p>

                      {line.stale ? (
                        <p className="text-gold-600 mt-2 inline-flex items-center gap-1.5 text-sm font-semibold">
                          <TriangleAlert aria-hidden="true" className="size-4" strokeWidth={2} />
                          {CART_STALE_LABEL}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        {/* The quantity control lives here and only here (the
                            steppers build): plain form posts with two submit
                            buttons, so it works without JavaScript. Minus rests
                            at one, plus at the cap, and a stale line (one the
                            menu no longer prices) shows no stepper at all. */}
                        {!line.stale && line.type !== 'plan' ? (
                          <form
                            action="/api/cart/qty"
                            className="border-line inline-flex items-center rounded-pill border bg-white"
                            method="post"
                          >
                            <input
                              name="line"
                              type="hidden"
                              value={encodeCartLine({
                                duration: line.duration,
                                product: line.slug,
                              })}
                            />
                            <input name="return" type="hidden" value="/cart" />

                            <button
                              aria-label={`${CART_QUANTITY_REMOVE_ONE} ${line.productTitle}`}
                              className={STEPPER_BUTTON}
                              disabled={line.qty <= 1}
                              name="delta"
                              type="submit"
                              value="-1"
                            >
                              <Minus aria-hidden="true" className="size-4" strokeWidth={2.25} />
                            </button>

                            <p className="min-w-7 text-center text-sm font-bold tabular-nums">
                              <span className="sr-only">{CART_QUANTITY_LABEL}: </span>
                              {line.qty}
                            </p>

                            <button
                              aria-label={`${CART_QUANTITY_ADD_ONE} ${line.productTitle}`}
                              className={STEPPER_BUTTON}
                              disabled={line.qty >= CART_MAX_QTY}
                              name="delta"
                              type="submit"
                              value="1"
                            >
                              <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
                            </button>
                          </form>
                        ) : null}

                        <form action="/api/cart/remove" method="post">
                          <input
                            name="line"
                            type="hidden"
                            value={encodeCartLine({ duration: line.duration, product: line.slug })}
                          />
                          <input name="return" type="hidden" value="/cart" />

                          <button
                            aria-label={
                              line.type !== 'plan'
                                ? `Remove ${line.productTitle} from the cart`
                                : `Remove ${line.duration} of ${line.productTitle} from the cart`
                            }
                            className="text-ink-600 hover:text-error hover:bg-error/10 focus-visible:ring-green-500 -ml-3 inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 text-sm font-semibold transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none"
                            type="submit"
                          >
                            <Trash2 aria-hidden="true" className="size-4" strokeWidth={2} />
                            {CART_REMOVE}
                          </button>
                        </form>
                      </div>
                    </div>

                    <p className="shrink-0 text-base font-bold text-green-900 tabular-nums sm:text-right">
                      {line.price !== null ? formatPaise(line.lineTotal) : '—'}                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {cart.stale.length > 0 ? (
              <p className="text-ink-600 mt-4 text-sm leading-6">{CART_STALE_NOTE}</p>
            ) : null}

            <Link
              className="group/back text-green-700 focus-visible:ring-green-500 mt-6 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
              href="/products"
            >
              <ArrowLeft
                aria-hidden="true"
                className="size-4 transition-transform duration-200 group-hover/back:-translate-x-1 motion-reduce:transition-none"
                strokeWidth={2}
              />
              {CART_KEEP_BROWSING}
            </Link>
          </section>

          {/* The summary: the one place the total and the way on live, pinned
              beside the lines on a wide screen. */}
          <aside
            aria-label={CART_SUMMARY_HEADING}
            className="bg-card rounded-2xl p-6 shadow-sm sm:p-7 lg:sticky lg:top-28"
          >
            <h2 className="text-lg font-bold text-green-900">{CART_SUMMARY_HEADING}</h2>

            <dl className="mt-5 flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink-600">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </dt>
                <dd className="text-ink-900 font-semibold tabular-nums">
                  {formatPaise(cart.total)}
                </dd>
              </div>
              <div className="border-line flex items-baseline justify-between gap-4 border-t pt-4">
                <dt className="text-ink-900 text-base font-bold">{CART_TOTAL}</dt>
                <dd className="text-[28px] leading-none font-extrabold text-green-900 tabular-nums">
                  {formatPaise(cart.total)}
                </dd>
              </div>
            </dl>

            {cart.usable.length > 0 && cart.stale.length === 0 ? (
              <Cta className="group/go mt-6 w-full" href="/checkout" variant="primary">
                {CART_CHECKOUT_CTA}
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-200 group-hover/go:translate-x-1 motion-reduce:transition-none"
                  strokeWidth={2.25}
                />
              </Cta>
            ) : null}

            <p className="text-ink-600 mt-5 flex items-start gap-2 text-sm leading-6">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-green-700"
                strokeWidth={2}
              />
              {CART_SUMMARY_BODY}
            </p>
          </aside>
        </div>
      )}
    </main>
  )
}
