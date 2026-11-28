import type { Metadata } from 'next'
import { CheckCircle2, Hash, MapPin, TriangleAlert } from 'lucide-react'
import Image from 'next/image'
import React from 'react'

import { CTA_BASE, CTA_VARIANTS, Cta } from '@/components/Cta'
import { JsonLd } from '@/components/JsonLd'
import { Section } from '@/components/home/Section'
import { Swoosh } from '@/components/Swoosh'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import type { Footer } from '@/payload-types'
import { areaForPincode, deliveryCheck, parseMapPin, readDeliveryAreas, readPhoto } from '@/utilities/deliveryArea'
import {
  DELIVERY_AREAS_HERO_IMAGE,
  DELIVERY_PHOTOS_FALLBACK,
  DELIVERY_PHOTOS_HEADING,
  DELIVERY_PHOTOS_INTRO,
  DELIVERY_AREAS_EYEBROW,
  DELIVERY_AREAS_HEADLINE,
  DELIVERY_AREAS_HEADLINE_ACCENT,
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
import { placeDeliveryAreas, placeKitchen } from '@/utilities/deliveryAreaPlaces'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { firstParam } from '@/utilities/searchParams'
import { breadcrumbJsonLd, webPageJsonLd } from '@/utilities/structuredData'
import { cn } from '@/utilities/ui'
import { WHATSAPP_CTA_LABEL, WHATSAPP_FALLBACK_LABEL, whatsappHref } from '@/utilities/whatsapp'

import { AreaCards } from './AreaCards'
import { DeliveryAreasProvider } from './DeliveryAreasContext'
import { DeliveryMap } from './DeliveryMap'

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
 * The green band is split: the headline and the pincode check on one side, the
 * map of every area on the other, so the first screen answers "do you come to
 * me?" both ways. The check is a plain GET form answered by the server, so it
 * works with JavaScript off and an answer can be linked. Below, a card per area
 * holds its pincodes; a card and its pin choose each other. Areas without a
 * typed pin are placed from their name and pincode (deliveryAreaPlaces). The
 * closing band is for everyone the list does not reach yet.
 */
export default async function DeliveryAreasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const typed = (firstParam(params.pincode) ?? '').trim()

  const [source, footer] = await Promise.all([
    // Depth 1, so the uploads arrive as media documents with their URLs.
    getCachedGlobal('delivery-areas', 1)(),
    getCachedGlobal('footer', 1)() as Promise<Footer | null>,
  ])
  const listed = readDeliveryAreas(source)
  const heroPhoto = readPhoto(source?.heroImage)
  const heroSrc = heroPhoto ? getMediaUrl(heroPhoto.url, heroPhoto.updatedAt) : DELIVERY_AREAS_HERO_IMAGE
  const uploaded = (source?.photos ?? []).flatMap((row) => {
    const photo = readPhoto(row.image)
    return photo
      ? [{ alt: photo.alt, caption: row.caption?.trim() ?? '', src: getMediaUrl(photo.url, photo.updatedAt) }]
      : []
  })
  const photos = uploaded.length > 0 ? uploaded : DELIVERY_PHOTOS_FALLBACK
  const [areas, kitchen] = await Promise.all([
    placeDeliveryAreas(listed),
    placeKitchen(parseMapPin(source?.kitchenPin), footer?.contact?.address),
  ])
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

      <DeliveryAreasProvider initial={area?.name ?? null}>
        <Section
          className="opening-band overflow-hidden bg-green-900 md:py-16"
          image={{ priority: true, src: heroSrc }}
          overlay="bg-green-900/85"
          tone="green"
        >
          <Swoosh className="-top-40 -left-40 w-[42rem] text-gold-400/[0.07]" />

          <div className="relative grid items-stretch gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
            <div className="flex flex-col justify-center">
              <p className="text-eyebrow text-gold-400 uppercase">{DELIVERY_AREAS_EYEBROW}</p>
              <h1 className="text-display mt-4 text-balance">
                {DELIVERY_AREAS_HEADLINE}{' '}
                <span className="text-gold-400 whitespace-nowrap italic">{DELIVERY_AREAS_HEADLINE_ACCENT}</span>
              </h1>
              <p className="text-lead text-cream/85 mt-5 max-w-[46ch]">
                {source?.intro?.trim() || DELIVERY_AREAS_INTRO_FALLBACK}
              </p>

              {areas.length > 0 ? (
                <ul className="mt-6 flex flex-wrap gap-2">
                  <li className="rounded-pill text-cream inline-flex items-center gap-2 bg-white/10 px-4 py-2 text-sm font-semibold">
                    <MapPin aria-hidden="true" className="text-gold-400 size-4" strokeWidth={2} />
                    {DELIVERY_STAT_AREAS(areas.length)}
                  </li>
                  <li className="rounded-pill text-cream inline-flex items-center gap-2 bg-white/10 px-4 py-2 text-sm font-semibold">
                    <Hash aria-hidden="true" className="text-gold-400 size-4" strokeWidth={2} />
                    {DELIVERY_STAT_PINCODES(pincodeCount)}
                  </li>
                </ul>
              ) : null}

              <div className="bg-card text-foreground mt-8 rounded-2xl p-5 shadow-lg sm:p-6" id="check">
                <h2 className="text-h3 text-green-900">{DELIVERY_CHECK_HEADING}</h2>

                <form
                  action={`${DELIVERY_AREAS_PATH}#check`}
                  className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
                  method="get"
                >
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
                      placeholder="600091"
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
            </div>

            {areas.length > 0 ? <DeliveryMap areas={areas} kitchen={kitchen} /> : null}
          </div>
        </Section>

        <Section id="areas" tone="cream">
          <div className="max-w-[46rem]">
            <h2 className="text-h2">{DELIVERY_LIST_HEADING}</h2>
            <p className="text-body text-ink-600 mt-3">{areas.length > 0 ? DELIVERY_LIST_INTRO : DELIVERY_LIST_EMPTY}</p>
          </div>

          {areas.length > 0 ? (
            <div className="mt-8">
              <AreaCards areas={areas} />
            </div>
          ) : null}
        </Section>
      </DeliveryAreasProvider>

      <Section tone="white">
        <div className="max-w-[46rem]">
          <h2 className="text-h2">{DELIVERY_PHOTOS_HEADING}</h2>
          <p className="text-body text-ink-600 mt-3">{DELIVERY_PHOTOS_INTRO}</p>
        </div>

        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, index) => (
            <li key={`${photo.src}-${index}`}>
              <figure>
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-green-50 shadow-sm">
                  <Image
                    alt={photo.alt}
                    className="object-cover"
                    fill
                    quality={75}
                    sizes="(min-width: 64rem) 26rem, (min-width: 40rem) 50vw, 100vw"
                    src={photo.src}
                  />
                </div>
                {photo.caption ? (
                  <figcaption className="text-ink-600 mt-3 text-sm leading-6">{photo.caption}</figcaption>
                ) : null}
              </figure>
            </li>
          ))}
        </ul>
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
