import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { ShieldCheck, ShoppingBag, TriangleAlert } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { CheckoutSteps } from '@/components/Store/CheckoutSteps'
import { PRODUCT_PLACEHOLDER } from '@/components/Store/productPlaceholder'
import { StoreEmptyState, StorePageHeader } from '@/components/Store/StorePage'
import { CART_COOKIE, readCart } from '@/utilities/cart'
import { codOffered } from '@/utilities/cashCheckout'
import { resolveCartLines } from '@/utilities/cartLines'
import { getSignedInCustomer } from '@/utilities/customerSessionServer'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { formatPaise } from '@/utilities/money'
import { addonsLabel } from '@/utilities/addons'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { cartLineKind, daysLabel } from '@/utilities/orderDisplay'

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
 * The checkout page (spec 0007, AC-4 and AC-5), step two of three. Signed in
 * customers only. The delivery form sits in a card on the left; the order, with
 * a photo per line and the total, is pinned beside it (above it on a phone), and
 * the pay button names the amount it will charge.
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

  if (cart.all.length === 0 || cart.stale.length > 0) {
    const empty = cart.all.length === 0

    return (
      <main className="container max-w-6xl py-10 sm:py-14">
        <CheckoutSteps current={1} />

        <StoreEmptyState
          body={empty ? CHECKOUT_EMPTY_BODY : CHECKOUT_STALE_BODY}
          cta={{
            href: empty ? '/products' : '/cart',
            label: empty ? CHECKOUT_EMPTY_CTA : CHECKOUT_STALE_CTA,
          }}
          heading={empty ? CHECKOUT_EMPTY_HEADING : CHECKOUT_STALE_HEADING}
          headingLevel="h1"
          icon={
            empty ? (
              <ShoppingBag className="size-7" strokeWidth={1.75} />
            ) : (
              <TriangleAlert className="size-7" strokeWidth={1.75} />
            )
          }
          tone={empty ? 'green' : 'gold'}
        />
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

  // The payment settings are read fresh: this page renders per request anyway,
  // and a stale "cash is on" would only meet the cash endpoint's own refusal.
  const [deliveryAreas, footer, paymentSettings] = await Promise.all([
    getCachedGlobal('delivery-areas')(),
    getCachedGlobal('footer', 1)(),
    payload.findGlobal({ depth: 0, overrideAccess: true, slug: 'payment-settings' }),
  ])
  const cashOffered = codOffered(
    {
      enabled: Boolean(paymentSettings.codEnabled),
      maxTotal: typeof paymentSettings.codMaxTotal === 'number' ? paymentSettings.codMaxTotal : null,
    },
    cart.total,
  )
  const contact = {
    email: footer?.contact?.email ?? null,
    phone: footer?.contact?.phone ?? null,
    whatsapp: footer?.contact?.whatsapp ?? null,
  }

  return (
    <main className="container max-w-6xl py-10 sm:py-14">
      <CheckoutSteps current={1} />

      <StorePageHeader heading={CHECKOUT_PAGE_HEADING} intro={CHECKOUT_PAGE_INTRO} />

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <CheckoutForm
          areas={{
            areas: (deliveryAreas.areas ?? []).map((area) => ({ name: area.name, pincodes: area.pincodes })),
            enforce: deliveryAreas.enforce,
          }}
          cashOffered={cashOffered}
          contact={contact}
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
          total={formatPaise(cart.total)}
        />

        {/* The order, pinned beside the form on a wide screen; on a phone it
            comes first, so the shopper sees what they are paying for. */}
        <aside
          aria-label={CHECKOUT_SUMMARY_HEADING}
          className="bg-card -order-1 rounded-2xl p-6 shadow-sm sm:p-7 lg:sticky lg:top-28 lg:order-none"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-green-900">{CHECKOUT_SUMMARY_HEADING}</h2>
            <Link
              className="text-green-700 focus-visible:ring-green-500 inline-flex min-h-11 items-center rounded-sm text-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
              href="/cart"
            >
              Edit cart
            </Link>
          </div>

          <ul className="divide-line mt-3 divide-y">
            {cart.usable.map((line) => (
              <li className="flex items-center gap-3 py-3" key={line.key}>
                <span className="relative size-14 shrink-0 overflow-hidden rounded-md bg-green-50">
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="56px"
                    src={line.image ? getMediaUrl(line.image.url) : PRODUCT_PLACEHOLDER}
                  />
                  {line.type !== 'plan' && line.qty > 1 ? (
                    <span className="bg-green-900 text-cream absolute top-1 right-1 grid min-w-5 place-items-center rounded-full px-1 text-[11px] leading-5 font-bold">
                      {line.qty}
                    </span>
                  ) : null}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-ink-900 truncate text-sm font-bold">{line.productTitle}</p>
                  <p className="text-ink-600 mt-0.5 text-sm">
                    {cartLineKind(line) ?? `${line.detail ?? line.duration}, ${daysLabel(line.days)}`}
                  </p>
                  {line.addons.length > 0 ? (
                    <p className="text-ink-600 mt-0.5 text-sm">With: {addonsLabel(line.addons)}</p>
                  ) : null}
                </div>

                <p className="shrink-0 text-right text-sm font-bold text-green-900 tabular-nums">
                  {formatPaise(line.lineTotal)}                </p>
              </li>
            ))}
          </ul>

          <div className="border-line mt-2 flex items-baseline justify-between gap-4 border-t pt-4">
            <p className="text-ink-900 text-base font-bold">{CHECKOUT_SUMMARY_TOTAL}</p>
            <p className="text-[28px] leading-none font-extrabold text-green-900 tabular-nums">
              {formatPaise(cart.total)}
            </p>
          </div>

          <p className="text-ink-600 mt-4 flex items-start gap-2 text-sm leading-6">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-green-700"
              strokeWidth={2}
            />
            <span>
              One payment covers every line above. Paid orders show on your{' '}
              <Link
                className="font-semibold text-green-700 underline underline-offset-4 transition-opacity hover:opacity-75 focus-visible:ring-[3px] focus-visible:ring-current focus-visible:outline-none motion-reduce:transition-none"
                href="/account?tab=orders"
              >
                account page
              </Link>
              .
            </span>
          </p>
        </aside>
      </div>
    </main>
  )
}
