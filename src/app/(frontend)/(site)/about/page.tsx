import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Baby,
  Check,
  Dumbbell,
  HeartPulse,
  HandHeart,
  Leaf,
  Package,
  Quote,
  Scale,
  Sparkles,
  Sprout,
  Wheat,
} from 'lucide-react'
import React from 'react'

import { Cta } from '@/components/Cta'
import { JsonLd } from '@/components/JsonLd'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { Section } from '@/components/home/Section'
import { Swoosh } from '@/components/Swoosh'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { DEFAULT_OG_IMAGE, mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { productCategoryHref } from '@/utilities/productsCategoryCopy'
import { WHATSAPP_FALLBACK_LABEL, whatsappHref } from '@/utilities/whatsapp'
import {
  ABOUT_FINAL_BODY,
  ABOUT_FINAL_PRIMARY,
  ABOUT_FINAL_SECONDARY,
  ABOUT_HERO_CTA,
  ABOUT_HERO_EYEBROW,
  ABOUT_HERO_HEADLINE,
  ABOUT_HERO_HEADLINE_ACCENT,
  ABOUT_HERO_SUB,
  ABOUT_IMAGES,
  ABOUT_JOURNEY_EYEBROW,
  ABOUT_JOURNEY_HEADING,
  ABOUT_JOURNEY_PARAGRAPHS,
  ABOUT_JOURNEY_STEPS,
  ABOUT_NAME_EYEBROW,
  ABOUT_NAME_HEADING,
  ABOUT_NAME_PARAGRAPHS,
  ABOUT_NAME_PARTS,
  ABOUT_NEEDS,
  ABOUT_NEEDS_HEADING,
  ABOUT_NEEDS_INTRO,
  ABOUT_PAGE_DESCRIPTION,
  ABOUT_PAGE_TITLE,
  ABOUT_SHARE_DESCRIPTION,
  ABOUT_TWITTER_DESCRIPTION,
  ABOUT_PROMISE,
  ABOUT_PROMISE_HEADING,
  ABOUT_PROMISE_TITLE,
  ABOUT_RANGE,
  ABOUT_RANGE_HEADING,
  ABOUT_RANGE_INTRO,
  ABOUT_STORY_EYEBROW,
  ABOUT_STORY_HEADING,
  ABOUT_STORY_IMAGE_ALT,
  ABOUT_STORY_PARAGRAPHS,
  ABOUT_STORY_SIGNATURE,
  ABOUT_TAGLINE,
  ABOUT_VISION,
  ABOUT_VISION_EYEBROW,
} from '@/utilities/aboutCopy'
import type { Footer } from '@/payload-types'
import {
  breadcrumbJsonLd,
  kitchenJsonLd,
  organizationJsonLd,
  webPageJsonLd,
  websiteJsonLd,
} from '@/utilities/structuredData'

export const metadata: Metadata = {
  alternates: { canonical: '/about' },
  description: ABOUT_PAGE_DESCRIPTION,
  openGraph: mergeOpenGraph({
    description: ABOUT_SHARE_DESCRIPTION,
    images: [{ ...DEFAULT_OG_IMAGE, alt: 'About UNAVE cloud kitchen in Chennai', url: '/og.png' }],
    title: ABOUT_PAGE_TITLE,
    url: '/about',
  }),
  // The title already names UNAVE, so the layout's suffix is skipped.
  title: { absolute: ABOUT_PAGE_TITLE },
  twitter: {
    card: 'summary_large_image',
    description: ABOUT_TWITTER_DESCRIPTION,
    images: [{ alt: 'About UNAVE cloud kitchen in Chennai', url: '/og.png' }],
    title: ABOUT_PAGE_TITLE,
  },
}

/** One icon per nutrition focus, in ABOUT_NEEDS order. No medical symbols (design.md §8). */
const NEED_ICONS = [Scale, Dumbbell, HeartPulse, Wheat, Leaf, Sparkles, Baby]

/** Freshness, nutrition, care. */
const PROMISE_ICONS = [Package, Leaf, HandHeart]

const EYEBROW = 'text-eyebrow text-gold-600 uppercase'

/** The one way to reach the kitchen, on a dark band. */
const MessageCta: React.FC<{ label: string; whatsapp: null | string }> = ({ label, whatsapp }) =>
  whatsapp ? (
    <Cta href={whatsappHref(whatsapp)} rel="noopener noreferrer" target="_blank" variant="onDark">
      <WhatsAppIcon className="size-4" />
      {label}
    </Cta>
  ) : (
    <Cta href="/contact" variant="onDark">
      {WHATSAPP_FALLBACK_LABEL}
    </Cta>
  )

/**
 * The about page (spec 0006): the founder's story, what the name means, the
 * three ranges, the nutrition focus with its notice, the journey, and the
 * vision and promise. Static content, so it stays a server component end to end.
 */
export default async function AboutPage() {
  const footer = (await getCachedGlobal('footer', 1)()) as Footer | null
  const whatsapp = footer?.contact?.whatsapp ?? null

  return (
    <main>
      <JsonLd
        data={[
          organizationJsonLd(),
          websiteJsonLd(),
          webPageJsonLd('AboutPage', '/about', ABOUT_PAGE_TITLE, ABOUT_PAGE_DESCRIPTION, {
            about: 'organization',
            breadcrumb: true,
          }),
          kitchenJsonLd(footer?.contact),
          breadcrumbJsonLd([
            { href: '/', label: 'Home' },
            { href: '/about', label: 'About' },
          ]),
        ]}
      />

      {/* Hero: the promise of the brand over a warm home meal. */}
      <Section
        className="opening-band overflow-hidden bg-green-900 md:py-24"
        image={{ priority: true, src: ABOUT_IMAGES.hero }}
        tone="green"
      >
        <Swoosh className="-top-40 -right-32 w-[42rem] text-gold-400/[0.08]" />

        <div className="relative max-w-[46rem]">
          {/* The eyebrow sits inside the h1 so the heading names the brand and the city. */}
          <h1 className="text-display text-balance">
            <span className="text-eyebrow text-gold-400 mb-4 block uppercase">{ABOUT_HERO_EYEBROW}</span>
            {ABOUT_HERO_HEADLINE}{' '}
            <span className="text-gold-400 whitespace-nowrap italic">{ABOUT_HERO_HEADLINE_ACCENT}</span>
          </h1>

          <p className="text-lead text-cream/85 mt-6 max-w-[52ch]">{ABOUT_HERO_SUB}</p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <MessageCta label={ABOUT_HERO_CTA} whatsapp={whatsapp} />
            <p className="text-caption text-cream/80 flex items-center gap-2 font-semibold">
              <Sprout aria-hidden="true" className="text-gold-400 size-4" strokeWidth={2} />
              {ABOUT_TAGLINE}
            </p>
          </div>
        </div>
      </Section>

      {/* The founder's story, with a kitchen photograph beside it. */}
      <Section tone="cream">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:items-center lg:gap-16">
          <div className="max-w-[64ch]">
            <p className={EYEBROW}>{ABOUT_STORY_EYEBROW}</p>
            <h2 className="text-h2 mt-3 text-balance">{ABOUT_STORY_HEADING}</h2>

            <div className="mt-6 flex flex-col gap-5">
              {ABOUT_STORY_PARAGRAPHS.map((paragraph, index) => (
                <p
                  className={index === 0 ? 'text-lead text-ink-900' : 'text-body text-ink-600'}
                  key={index}
                >
                  {paragraph}
                </p>
              ))}
            </div>

            <p className="text-ink-900 mt-6 flex items-center gap-3 text-sm font-bold">
              <span aria-hidden="true" className="bg-gold-500 h-px w-10" />
              {ABOUT_STORY_SIGNATURE}
            </p>
          </div>

          <figure className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-md">
              <Image
                alt={ABOUT_STORY_IMAGE_ALT}
                className="object-cover"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                src={ABOUT_IMAGES.story}
              />
            </div>
          </figure>
        </div>
      </Section>

      {/* Vision and promise: where we are going, and what every order keeps to. */}
      <Section tone="white">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-16">
          <figure className="relative rounded-3xl bg-green-900 p-8 text-cream md:p-10">
            <Quote aria-hidden="true" className="text-gold-400 size-10" strokeWidth={1.5} />
            <figcaption className="text-eyebrow text-gold-400 mt-4 uppercase">{ABOUT_VISION_EYEBROW}</figcaption>
            <blockquote className="mt-3 font-serif text-2xl leading-snug text-balance md:text-[28px]">
              {ABOUT_VISION}
            </blockquote>
          </figure>

          <div>
            <p className={EYEBROW}>{ABOUT_PROMISE_HEADING}</p>
            <h2 className="text-h2 mt-3">{ABOUT_PROMISE_TITLE}</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-3">
              {ABOUT_PROMISE.map((line, index) => {
                const Icon = PROMISE_ICONS[index] ?? Leaf
                return (
                  <li className="border-line rounded-2xl border bg-green-50 p-5" key={line.lead}>
                    <span className="grid size-11 place-items-center rounded-full bg-white text-green-700 shadow-sm">
                      <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
                    </span>
                    <span className="mt-4 block font-serif text-xl font-bold text-green-900">{line.lead}</span>
                    <span className="text-ink-600 mt-1 block text-sm">{line.rest}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </Section>

      {/* What the name means: Unavu + Vision. */}
      <Section tone="cream">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-14">
          <div>
            <p className={EYEBROW}>{ABOUT_NAME_EYEBROW}</p>
            <h2 className="text-h2 mt-3">{ABOUT_NAME_HEADING}</h2>

            <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              {ABOUT_NAME_PARTS.map((part, index) => (
                <React.Fragment key={part.term}>
                  {index > 0 ? (
                    <span aria-hidden="true" className="text-gold-600 text-3xl font-bold">
                      +
                    </span>
                  ) : null}
                  <span className="rounded-2xl bg-green-50 px-5 py-4">
                    <span className="block font-serif text-2xl font-bold text-green-900 sm:text-3xl">
                      {part.term}
                    </span>
                    <span className="text-ink-600 text-sm">{part.meaning}</span>
                  </span>
                </React.Fragment>
              ))}
              <span aria-hidden="true" className="text-gold-600 text-3xl font-bold">
                =
              </span>
              <span className="rounded-2xl bg-green-900 px-5 py-4">
                <span className="text-gold-400 block font-serif text-2xl font-bold tracking-wide sm:text-3xl">
                  UNAVE
                </span>
                <span className="text-cream/80 text-sm">Food with care</span>
              </span>
            </div>
          </div>

          <div className="flex max-w-[60ch] flex-col gap-5">
            {ABOUT_NAME_PARAGRAPHS.map((paragraph, index) => (
              <p className="text-body text-ink-600" key={index}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </Section>

      {/* The three ranges, each with its photo and a way into the shop. */}
      <Section tone="tint">
        <h2 className="text-h2">{ABOUT_RANGE_HEADING}</h2>
        <p className="text-body text-ink-600 mt-3 max-w-[60ch]">{ABOUT_RANGE_INTRO}</p>

        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {ABOUT_RANGE.map((item, index) => (
            <li className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm" key={item.title}>
              <div className="relative aspect-[4/3] bg-green-50">
                <Image
                  alt={item.alt}
                  className="object-cover"
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  src={item.image}
                />
                <span
                  aria-hidden="true"
                  className="rounded-pill absolute top-3 left-3 bg-white/95 px-3 py-1 text-sm font-bold text-green-900 shadow-sm"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-h3">{item.title}</h3>
                <p className="text-body text-ink-600 mt-2 flex-1">{item.text}</p>
                <Link
                  className="mt-4 inline-flex min-h-11 items-center gap-2 self-start rounded-sm text-sm font-bold text-green-700 underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none"
                  href={productCategoryHref(item.category)}
                >
                  {item.link}
                  <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* The nutrition focus. */}
      <Section tone="white">
        <div className="max-w-[60ch]">
          <h2 className="text-h2">{ABOUT_NEEDS_HEADING}</h2>
          <p className="text-body text-ink-600 mt-3">{ABOUT_NEEDS_INTRO}</p>
        </div>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ABOUT_NEEDS.map((need, index) => {
            const Icon = NEED_ICONS[index] ?? Leaf
            return (
              <li className="border-line flex items-center gap-3 rounded-xl border bg-white p-4" key={need}>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-green-100 text-green-700">
                  <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
                </span>
                <span className="text-ink-900 text-sm font-semibold">{need}</span>
              </li>
            )
          })}
        </ul>      </Section>

      {/* The journey, over the morning field. */}
      <Section image={{ src: ABOUT_IMAGES.journey }} overlay="bg-background/85" tone="cream">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-[60ch]">
            <p className={EYEBROW}>{ABOUT_JOURNEY_EYEBROW}</p>
            <h2 className="text-h2 mt-3">{ABOUT_JOURNEY_HEADING}</h2>
            <div className="mt-6 flex flex-col gap-5">
              {ABOUT_JOURNEY_PARAGRAPHS.map((paragraph, index) => (
                <p className="text-body text-ink-600" key={index}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <ul className="flex flex-col gap-3 self-center">
            {ABOUT_JOURNEY_STEPS.map((step) => (
              <li className="flex items-start gap-3 rounded-xl bg-white/90 p-4 shadow-sm" key={step}>
                <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-green-700" strokeWidth={2.5} />
                <span className="text-ink-900 text-body">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Closing: the tagline and the one way to reach us. */}
      <Section className="relative overflow-hidden text-center" tone="green">
        <Swoosh className="-top-32 left-1/2 w-[40rem] -translate-x-1/2 text-gold-400/[0.08]" />

        <div className="relative mx-auto max-w-[46rem]">
          <p className="text-eyebrow text-gold-400 uppercase">UNAVE</p>
          <h2 className="text-h2 mt-3">{ABOUT_TAGLINE}</h2>
          <p className="text-lead text-cream/85 mt-4">{ABOUT_FINAL_BODY}</p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <MessageCta label={ABOUT_FINAL_PRIMARY} whatsapp={whatsapp} />
            <Cta href="/contact" variant="onDarkSecondary">
              {ABOUT_FINAL_SECONDARY}
            </Cta>
          </div>
        </div>
      </Section>
    </main>
  )
}
