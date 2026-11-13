import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { Cta } from '@/components/Cta'
import { CART_COOKIE, readCart } from '@/utilities/cart'
import { resolveCartLines } from '@/utilities/cartLines'
import { getSignedInCustomer } from '@/utilities/customerSessionServer'
import { formatPaise } from '@/utilities/money'
import { PRODUCT_ONE_TIME_LABEL } from '@/utilities/productsCopy'

import { CheckoutForm } from './CheckoutForm'
import {
  CHECKOUT_EMPTY_BODY,
  CHECKOUT_EMPTY_CTA,
  CHECKOUT_EMPTY_HEADING,
  CHECKOUT_PAGE_HEADING,
  CHECKOUT_PAGE_INTRO,
  CHECKOUT_PAGE_TITLE,
  CHECKOUT_STALE_BODY,
  CHECKOUT_STALE_CTA,
  CHECKOUT_STALE_HEADING,
  CHECKOUT_SUMMARY_HEADING,
  CHECKOUT_SUMMARY_TOTAL,
} from './copy'

/**
 * The checkout page (spec 0007, AC-4 and AC-5). Signed in customers only.
 *
 * The basket comes from the cart cookie, never from the address, and every
 * line is resolved against the live product records here, so the prices and the
 * total are the server's. An empty cart, including an old shared link, gets one
 * plain sentence and a way back to the products. A stale line blocks payment
 * with a sentence and a way to the cart to fix it.
 *
 * The sign in guard carries the checkout address through; the cart cookie is
 * untouched by sign in, so the basket survives the round trip with no merge.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { follow: false, index: false, nocache: true },
  title: CHECKOUT_PAGE_TITLE,
}

type CheckoutProfile = {
  address?: {
    city?: string | null
    line1?: string | null
    line2?: string | null
    pincode?: string | null
    state?: string | null
  } | null
  name?: string | null
  foodPreference?: string | null
  phone?: string | null
}

export default async function CheckoutPage() {
  const customer = await getSignedInCustomer()

  if (!customer) redirect(`/sign-in?return=${encodeURIComponent('/checkout')}`)

  const cookieStore = await cookies()
  const lines = readCart(cookieStore.get(CART_COOKIE)?.value)

  const payload = await getPayload({ config: configPromise })
  const cart = await resolveCartLines({ lines, payload })

  if (cart.all.length === 0) {
    return (
      <main className="container max-w-3xl py-16 sm:py-20">
        <h1 className="text-h2">{CHECKOUT_EMPTY_HEADING}</h1>
        <p className="text-body text-ink-600 mt-3">{CHECKOUT_EMPTY_BODY}</p>

        <div className="mt-6">
          <Cta href="/products" variant="primary">
            {CHECKOUT_EMPTY_CTA}
          </Cta>
        </div>
      </main>
    )
  }

  if (cart.stale.length > 0) {
    return (
      <main className="container max-w-3xl py-16 sm:py-20">
        <h1 className="text-h2">{CHECKOUT_STALE_HEADING}</h1>
        <p className="text-body text-ink-600 mt-3">{CHECKOUT_STALE_BODY}</p>

        <div className="mt-6">
          <Cta href="/cart" variant="primary">
            {CHECKOUT_STALE_CTA}
          </Cta>
        </div>
      </main>
    )
  }

  const profile = (await payload.findByID({
    collection: 'customers',
    depth: 0,
    id: customer.id,
    overrideAccess: true,
    select: {
      address: { city: true, line1: true, line2: true, pincode: true, state: true },
      name: true,
      foodPreference: true,
      phone: true,
    },
  })) as CheckoutProfile | null

  return (
    <main className="container max-w-5xl py-16 sm:py-20">
      <header className="flex flex-col gap-2">
        <h1 className="text-h2">{CHECKOUT_PAGE_HEADING}</h1>
        <p className="text-body text-ink-600">{CHECKOUT_PAGE_INTRO}</p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <CheckoutForm
          defaults={{
            city: profile?.address?.city ?? '',
            foodPreference: profile?.foodPreference ?? 'none',
            line1: profile?.address?.line1 ?? '',
            line2: profile?.address?.line2 ?? '',
            name: profile?.name?.trim() || customer.name || '',
            phone: profile?.phone ?? '',
            pincode: profile?.address?.pincode ?? '',
            state: profile?.address?.state ?? '',
          }}
          email={customer.email}
        />

        <aside aria-label={CHECKOUT_SUMMARY_HEADING} className="flex min-w-0 flex-col gap-6">
          <section className="border-line rounded-2xl border bg-white p-6 sm:p-8">
            <h2 className="text-h3">{CHECKOUT_SUMMARY_HEADING}</h2>

            <ul className="border-line divide-line mt-4 divide-y border-t">
              {cart.usable.map((line) => (
                <li className="flex items-start justify-between gap-4 py-4" key={line.key}>
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{line.productTitle}</p>
                    <p className="text-ink-600 mt-0.5 text-sm">
                      {line.type === 'combo'
                        ? 'Meal combo'
                        : line.type === 'one-time'
                          ? PRODUCT_ONE_TIME_LABEL
                        : `${line.duration}, ${line.days} ${line.days === 1 ? 'day' : 'days'}`}
                    </p>
                  </div>

                  <p className="shrink-0 text-right text-sm font-bold">
                    {formatPaise(line.lineTotal)}
                    {line.type !== 'plan' && line.qty > 1 ? (
                      <span className="text-ink-600 mt-0.5 block text-xs font-medium">
                        {line.qty} &times; {formatPaise(line.price ?? 0)}
                      </span>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>

            <div className="border-line mt-2 flex items-center justify-between border-t pt-4">
              <p className="font-bold">{CHECKOUT_SUMMARY_TOTAL}</p>
              <p className="text-green-700 text-lg font-bold">{formatPaise(cart.total)}</p>
            </div>

            <p className="text-ink-600 mt-4 text-sm leading-6">
              One payment covers every line above. Paid orders show on your{' '}
              <Link
                className="text-green-700 hover:opacity-75 font-semibold transition-opacity focus-visible:ring-[3px] focus-visible:ring-current focus-visible:outline-none motion-reduce:transition-none"
                href="/account?tab=orders"
              >
                account page
              </Link>
              .
            </p>
          </section>
        </aside>
      </div>
    </main>
  )
}
