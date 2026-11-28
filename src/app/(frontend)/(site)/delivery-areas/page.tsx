import type { Metadata } from 'next'
import { CheckCircle2, Hash, MapPin, TriangleAlert } from 'lucide-react'
import React from 'react'

import { CTA_BASE, CTA_VARIANTS, Cta } from '@/components/Cta'
import { JsonLd } from '@/components/JsonLd'
import { PageHero } from '@/components/PageHero'
import { Section } from '@/components/home/Section'
import { Swoosh } from '@/components/Swoosh'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import type { Footer } from '@/payload-types'
import { areaForPincode, deliveryCheck, parseMapPin, readDeliveryAreas } from '@/utilities/deliveryArea'
import {
  DELIVERY_AREAS_EYEBROW,
  DELIVERY_AREAS_HEADLINE,
  DELIVERY_AREAS_HEADLINE_ACCENT,
  DELIVERY_AREAS_HERO_IMAGE,
  DELIVERY_AREAS_INTRO_FALLBACK,
  DELIVERY_AREAS_PAGE_DESCRIPTION,
  DELIVERY_AREAS_PAGE_TITLE,
  DELIVERY_AREAS_PATH,
  DELIVERY_CHECK_CTA,
  DELIVERY_CHECK_HEADING,
  DELIVERY_CHECK_INVALID,
  DELIVERY_CHECK_LABEL,
  DELIVERY_FINAL_BODY,
  DELIVERY_FINAL_HEADING,
  DELIVERY_FINAL_SECONDARY,
  DELIVERY_LIST_EMPTY,
  DELIVERY_LIST_HEADING,
  DELIVERY_LIST_INTRO,
  DELIVERY_NOT_SERVED,
  DELIVERY_SERVED,
  DELIVERY_STAT_AREAS,
  DELIVERY_STAT_PINCODES,
  DELIVERY_UNCHECKED,
} from '@/utilities/deliveryAreaCopy'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { firstParam } from '@/utilities/searchParams'
import { breadcrumbJsonLd, webPageJsonLd } from '@/utilities/structuredData'
import { cn } from '@/utilities/ui'
import { WHATSAPP_CTA_LABEL, WHATSAPP_FALLBACK_LABEL, whatsappHref } from '@/utilities/whatsapp'

import { DeliveryAreasExplorer } from './DeliveryAreasExplorer'

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
 * Where the kitchen delivers (admin → Website → Delivery areas).
 *
 * The green band opens with the pincode check, the page's one job: a plain GET
 * form answered by the server, so it works with JavaScript off and an answer
 * can be linked. Below it the areas sit beside a map of them; the list is the
 * content and the map draws on top of it after load. The closing band is for
 * everyone the list does not reach yet. No account is needed for any of it.
 */
export default async function DeliveryAreasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const typed = (firstParam(params.pincode) ?? '').trim()

  const [source, footer] = await Promise.all([
    getCachedGlobal('delivery-areas')(),
    getCachedGlobal('footer', 1)() as Promise<Footer | null>,
  ])
  const areas = readDeliveryAreas(source)
  const kitchen = parseMapPin(source?.kitchenPin)
  const whatsapp = footer?.contact?.whatsapp ? whatsappHref(footer.contact.whatsapp) : null
  const pincodeCount = areas.reduce((sum, area) => sum + area.pincodes.length, 0)

  const valid = PINCODE.test(typed)
  const area = valid ? areaForPincode(areas, typed) : null

  // A pincode on the list is good news even while the checkout check is off.
  const answer = !typed
    ? null
    : !valid
      ? ({ kind: 'invalid', text: DELIVERY_CHECK_INVALID } as const)
      : area
        ? ({ kind: 'served', text: DELIVERY_SERVED(area.name, typed) } as const)
        : deliveryCheck(source, typed) === 'not-served'
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

      <PageHero
        accent={DELIVERY_AREAS_HEADLINE_ACCENT}
        eyebrow={DELIVERY_AREAS_EYEBROW}
        headline={DELIVERY_AREAS_HEADLINE}
        image={DELIVERY_AREAS_HERO_IMAGE}
        sub={source?.intro?.trim() || DELIVERY_AREAS_INTRO_FALLBACK}
      >
        {areas.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
            <li className="text-caption text-cream/85 flex items-center gap-2">
              <MapPin aria-hidden="true" className="text-gold-400 size-4" strokeWidth={2} />
              {DELIVERY_STAT_AREAS(areas.length)}
            </li>
            <li className="text-caption text-cream/85 flex items-center gap-2">
              <Hash aria-hidden="true" className="text-gold-400 size-4" strokeWidth={2} />
              {DELIVERY_STAT_PINCODES(pincodeCount)}
            </li>
          </ul>
        ) : null}

        <div className="bg-card text-foreground mt-8 max-w-[34rem] rounded-2xl p-5 shadow-lg sm:p-6" id="check">
          <h2 className="text-h3 text-green-900">{DELIVERY_CHECK_HEADING}</h2>

          <form action={`${DELIVERY_AREAS_PATH}#check`} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" method="get">
            <div className="min-w-0 flex-1">
              <label className="text-ink-900 block text-sm font-semibold" htmlFor="delivery-pincode">
                {DELIVERY_CHECK_LABEL}
              </label>
              <input
                aria-describedby={answer ? 'delivery-answer' : undefined}
                aria-invalid={answer?.kind === 'invalid' || undefined}
                autoComplete="postal-code"
                className="border-line text-ink-900 hover:border-ink-400 mt-2 block h-13 w-full rounded-sm border bg-white px-4 text-base tracking-wide tabular-nums transition-colors focus:border-green-700 focus:ring-[3px] focus:ring-green-500 focus:outline-none motion-reduce:transition-none"
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
              className={cn('mt-4 rounded-xl p-4', answer.kind === 'served' ? 'bg-green-50' : 'bg-gold-100')}
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
                <a
                  className="mt-2 ml-8 inline-flex min-h-11 items-center gap-2 rounded-sm font-semibold text-green-700 underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none"
                  href={whatsapp}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <WhatsAppIcon className="size-4" />
                  {WHATSAPP_CTA_LABEL}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </PageHero>

      <Section id="areas" tone="cream">
        <div className="max-w-[46rem]">
          <h2 className="text-h2">{DELIVERY_LIST_HEADING}</h2>
          {areas.length > 0 ? <p className="text-body text-ink-600 mt-3">{DELIVERY_LIST_INTRO}</p> : null}
        </div>

        <div className="mt-8">
          {areas.length > 0 ? (
            <DeliveryAreasExplorer areas={areas} initial={area?.name ?? null} kitchen={kitchen} />
          ) : (
            <p className="text-body text-ink-600 max-w-[60ch]">{DELIVERY_LIST_EMPTY}</p>
          )}
        </div>
      </Section>

      <Section className="relative overflow-hidden text-center" tone="green">
        <Swoosh className="-top-32 left-1/2 w-[40rem] -translate-x-1/2 text-gold-400/[0.08]" />

        <div className="relative mx-auto max-w-[46rem]">
          <h2 className="text-h2">{DELIVERY_FINAL_HEADING}</h2>
          <p className="text-lead text-cream/85 mt-4">{DELIVERY_FINAL_BODY}</p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {whatsapp ? (
              <Cta href={whatsapp} rel="noopener noreferrer" target="_blank" variant="onDark">
                <WhatsAppIcon className="size-4" />
                {WHATSAPP_CTA_LABEL}
              </Cta>
            ) : (
              <Cta href="/contact" variant="onDark">
                {WHATSAPP_FALLBACK_LABEL}
              </Cta>
            )}

            {whatsapp ? (
              <Cta href="/contact" variant="onDarkSecondary">
                {DELIVERY_FINAL_SECONDARY}
              </Cta>
            ) : null}
          </div>
        </div>
      </Section>
    </main>
  )
}
