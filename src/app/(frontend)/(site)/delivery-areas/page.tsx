import type { Metadata } from 'next'
import { CheckCircle2, MapPin, MessageCircle, TriangleAlert } from 'lucide-react'
import React from 'react'

import { CTA_BASE, CTA_VARIANTS, Cta } from '@/components/Cta'
import { JsonLd } from '@/components/JsonLd'
import { Section } from '@/components/home/Section'
import type { Footer } from '@/payload-types'
import { areaForPincode, deliveryCheck, readDeliveryAreas } from '@/utilities/deliveryArea'
import {
  DELIVERY_AREAS_EYEBROW,
  DELIVERY_AREAS_HEADLINE,
  DELIVERY_AREAS_PAGE_DESCRIPTION,
  DELIVERY_AREAS_PAGE_TITLE,
  DELIVERY_AREAS_PATH,
  DELIVERY_CHECK_CTA,
  DELIVERY_CHECK_HEADING,
  DELIVERY_CHECK_INVALID,
  DELIVERY_CHECK_LABEL,
  DELIVERY_LIST_EMPTY,
  DELIVERY_LIST_HEADING,
  DELIVERY_NOT_SERVED,
  DELIVERY_SERVED,
  DELIVERY_UNCHECKED,
} from '@/utilities/deliveryAreaCopy'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { firstParam } from '@/utilities/searchParams'
import { breadcrumbJsonLd, webPageJsonLd } from '@/utilities/structuredData'
import { cn } from '@/utilities/ui'
import { WHATSAPP_CTA_LABEL, whatsappHref } from '@/utilities/whatsapp'

/** The pincode check reads the query string, so the page is never static. */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: DELIVERY_AREAS_PATH },
  description: DELIVERY_AREAS_PAGE_DESCRIPTION,
  openGraph: mergeOpenGraph({
    description: DELIVERY_AREAS_PAGE_DESCRIPTION,
    title: DELIVERY_AREAS_PAGE_TITLE,
    url: DELIVERY_AREAS_PATH,
  }),
  title: DELIVERY_AREAS_PAGE_TITLE,
}

type SearchParams = Record<string, string | string[] | undefined>

const PINCODE = /^\d{6}$/

/**
 * Where the kitchen delivers (admin → Website → Delivery areas). The pincode
 * check is a plain GET form answered by the server, so it works with JavaScript
 * off and an answer can be linked. No account is needed to look.
 */
export default async function DeliveryAreasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const typed = (firstParam(params.pincode) ?? '').trim()

  const [source, footer] = await Promise.all([
    getCachedGlobal('delivery-areas')(),
    getCachedGlobal('footer', 1)() as Promise<Footer | null>,
  ])
  const areas = readDeliveryAreas(source)
  const whatsapp = footer?.contact?.whatsapp ? whatsappHref(footer.contact.whatsapp) : null

  const valid = PINCODE.test(typed)
  const check = valid ? deliveryCheck(source, typed) : null
  const area = valid ? areaForPincode(areas, typed) : null

  // A pincode on the list is good news even while the checkout check is off.
  const answer = !typed
    ? null
    : !valid
      ? ({ kind: 'invalid', text: DELIVERY_CHECK_INVALID } as const)
      : area
        ? ({ kind: 'served', text: DELIVERY_SERVED(area.name, typed) } as const)
        : check === 'not-served'
          ? ({ kind: 'not-served', text: DELIVERY_NOT_SERVED(typed) } as const)
          : ({ kind: 'unchecked', text: DELIVERY_UNCHECKED(typed) } as const)

  return (
    <main>
      <JsonLd
        data={[
          webPageJsonLd('WebPage', DELIVERY_AREAS_PATH, DELIVERY_AREAS_PAGE_TITLE, DELIVERY_AREAS_PAGE_DESCRIPTION, {
            breadcrumb: true,
          }),
          breadcrumbJsonLd([
            { href: '/', label: 'Home' },
            { href: DELIVERY_AREAS_PATH, label: 'Delivery areas' },
          ]),
        ]}
      />

      <Section className="bg-green-900" tone="green">
        <div className="max-w-[46rem]">
          <h1 className="text-display text-balance">
            <span className="text-eyebrow text-gold-400 mb-4 block uppercase">{DELIVERY_AREAS_EYEBROW}</span>
            {DELIVERY_AREAS_HEADLINE}
          </h1>
          {source?.intro ? <p className="text-lead text-cream/85 mt-6 max-w-[52ch]">{source.intro}</p> : null}
        </div>
      </Section>

      <Section id="check" tone="white">
        <div className="max-w-[36rem]">
          <h2 className="text-h2">{DELIVERY_CHECK_HEADING}</h2>

          <form action={`${DELIVERY_AREAS_PATH}#check`} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end" method="get">
            <div className="flex-1">
              <label className="text-ink-900 block text-sm font-semibold" htmlFor="delivery-pincode">
                {DELIVERY_CHECK_LABEL}
              </label>
              <input
                aria-describedby={answer ? 'delivery-answer' : undefined}
                aria-invalid={answer?.kind === 'invalid' || undefined}
                autoComplete="postal-code"
                className="border-line text-ink-900 hover:border-ink-400 mt-2 block h-13 w-full rounded-sm border bg-white px-4 text-base transition-colors focus:border-green-700 focus:ring-[3px] focus:ring-green-500 focus:outline-none motion-reduce:transition-none"
                defaultValue={typed}
                id="delivery-pincode"
                inputMode="numeric"
                maxLength={6}
                name="pincode"
                pattern="\d{6}"
                placeholder="600020"
              />
            </div>
            <button className={cn(CTA_BASE, CTA_VARIANTS.primary)} type="submit">
              {DELIVERY_CHECK_CTA}
            </button>
          </form>

          {answer ? (
            <div
              aria-live="polite"
              className={cn(
                'mt-6 rounded-xl p-5',
                answer.kind === 'served' ? 'bg-green-50' : 'bg-gold-100',
              )}
              id="delivery-answer"
              role="status"
            >
              <p className="text-ink-900 flex items-start gap-3 text-base leading-7">
                {answer.kind === 'served' ? (
                  <CheckCircle2 aria-hidden="true" className="mt-1 size-5 shrink-0 text-green-700" strokeWidth={2} />
                ) : (
                  <TriangleAlert aria-hidden="true" className="text-gold-600 mt-1 size-5 shrink-0" strokeWidth={2} />
                )}
                <span>{answer.text}</span>
              </p>

              {answer.kind !== 'served' && answer.kind !== 'invalid' && whatsapp ? (
                <div className="mt-4">
                  <Cta href={whatsapp} rel="noopener noreferrer" target="_blank" variant="secondary">
                    <MessageCircle aria-hidden="true" className="size-4" strokeWidth={2.25} />
                    {WHATSAPP_CTA_LABEL}
                  </Cta>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Section>

      <Section tone="tint">
        <h2 className="text-h2">{DELIVERY_LIST_HEADING}</h2>

        {areas.length > 0 ? (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((item) => (
              <li className="bg-card flex min-h-11 items-start gap-3 rounded-xl p-4" key={item.name}>
                <MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-green-700" strokeWidth={2} />
                <span className="min-w-0">
                  <span className="text-ink-900 block font-semibold">{item.name}</span>
                  {item.pincodes.length > 0 ? (
                    <span className="text-ink-600 mt-0.5 block text-sm break-words tabular-nums">
                      {item.pincodes.join(', ')}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-ink-600 mt-3 max-w-[60ch]">{DELIVERY_LIST_EMPTY}</p>
        )}
      </Section>
    </main>
  )
}
