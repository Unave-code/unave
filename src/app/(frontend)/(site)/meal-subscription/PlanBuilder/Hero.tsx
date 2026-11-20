import { ArrowRight, Clock, Sparkles } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { PRODUCT_PLACEHOLDER } from '@/components/Store/productPlaceholder'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { formatPaise } from '@/utilities/money'
import type { PlanBuilderData } from '@/utilities/planBuilder'
import { fromPrice as leadPrice, MEAL_PLANS_PATH } from '@/utilities/planBuilder'
import { cn } from '@/utilities/ui'
import { whatsappHref } from '@/utilities/whatsapp'

import { focusRing, MEAL_ICON, MEAL_LABEL } from './ui'
import type { PlanBuilderState } from './usePlanBuilder'

/** The plan's photo, title, starting price and delivery facts, above the builder. */
export function PlanHero({ data, state }: { data: PlanBuilderData; state: PlanBuilderState }) {
  const { offered, times } = state
  const fromPrice = leadPrice(data)
  return (
    <section className="bg-card pt-6 pb-12 md:pt-10 md:pb-16">
      <div className="container">
        <nav aria-label="Breadcrumb">
          <ol className="text-caption text-ink-600 flex flex-wrap items-center gap-2">
            <li>
              <Link className="inline-flex min-h-11 items-center font-bold underline-offset-4 hover:text-green-700 hover:underline" href={MEAL_PLANS_PATH}>
                Meal plans
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li aria-current="page" className="text-ink-900 max-w-[28ch] truncate">
              {data.title}
            </li>
          </ol>
        </nav>

        <div className="mt-4 grid items-start gap-8 md:grid-cols-2 lg:gap-14">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-green-50 shadow-md md:sticky md:top-24">
            <Image
              alt={data.image?.alt || data.title}
              className="object-cover"
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              src={data.image ? getMediaUrl(data.image.url) : PRODUCT_PLACEHOLDER}
            />
          </div>

          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-pill inline-flex min-h-7 items-center bg-green-100 px-3 text-xs font-bold tracking-wide text-green-800 uppercase">
                Meal plan
              </span>
              {data.audience?.title && (
                <span className="rounded-pill ring-line text-ink-600 inline-flex min-h-7 items-center px-3 text-xs font-bold tracking-wide uppercase ring-1 ring-inset">
                  {data.audience.title}
                </span>
              )}
            </div>

            <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.01em] text-balance text-green-900 md:text-[36px]">{data.title}</h1>

            <p className="text-caption text-ink-600 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5 font-bold text-green-700">
                <span aria-hidden="true" className="bg-success size-2 rounded-full" />
                Delivered Monday to Saturday
              </span>
            </p>

            {fromPrice !== null && (
              <p className="border-line mt-6 border-t pt-6">
                <span className="text-ink-600 block text-sm">From, for one person</span>
                <span className="text-[34px] leading-tight font-extrabold text-green-900 tabular-nums">{formatPaise(fromPrice)}</span>
              </p>
            )}

            {data.description && <p className="text-body text-ink-600 mt-4 max-w-[56ch]">{data.description}</p>}

            <dl className="border-line mt-6 divide-y divide-[var(--line)] rounded-2xl border text-sm">
              {offered.map((m) => {
                const Icon = MEAL_ICON[m]
                return (
                  <div className="flex items-center gap-3 px-4 py-3" key={m}>
                    <dt className="text-ink-600 flex w-28 shrink-0 items-center gap-2">
                      <Icon aria-hidden className="text-gold-600 size-4" /> {MEAL_LABEL[m]}
                    </dt>
                    <dd className="text-ink-900 font-bold">{times[m] || 'Delivery time confirmed by phone'}</dd>
                  </div>
                )
              })}
              <div className="flex items-center gap-3 px-4 py-3">
                <dt className="text-ink-600 flex w-28 shrink-0 items-center gap-2">
                  <Clock aria-hidden className="text-gold-600 size-4" /> Lengths
                </dt>
                <dd className="text-ink-900 font-bold">{data.plans.map((p) => p.label).join(' · ')}</dd>
              </div>
              {data.optionGroups.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <dt className="text-ink-600 flex w-28 shrink-0 items-center gap-2">
                    <Sparkles aria-hidden className="text-gold-600 size-4" /> Options
                  </dt>
                  <dd className="text-ink-900 font-bold">{data.optionGroups.map((g) => g.title).join(', ')}</dd>
                </div>
              )}
            </dl>

            <a
              className="rounded-pill text-button text-cream mt-8 inline-flex h-13 w-full items-center justify-center gap-2 bg-green-700 px-7 transition-colors hover:bg-green-600 focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none sm:w-auto"
              href="#builder"
            >
              Build your plan <ArrowRight aria-hidden className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Shown in place of the builder until the plan has a menu and at least one price. */
export function PlanEmpty({ whatsapp }: { whatsapp: null | string }) {
  return (
    <main className="bg-cream">
      <section className="container max-w-2xl py-20 text-center">
        <h1 className="text-ink-900 text-2xl font-extrabold">Plans open soon</h1>
        <p className="text-ink-600 mt-3">We are setting up this plan&apos;s menu and prices. Message us and we will help you start.</p>
        {whatsapp && (
          <a
            className={cn('rounded-pill mt-6 inline-flex h-13 items-center gap-2 bg-green-700 px-7 font-bold text-white hover:bg-green-600', focusRing)}
            href={whatsappHref(whatsapp)}
            rel="noopener noreferrer"
            target="_blank"
          >
            <WhatsAppIcon className="size-5" /> Message us on WhatsApp
          </a>
        )}
      </section>
    </main>
  )
}
