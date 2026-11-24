import React from 'react'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { StorePageHeader } from '@/components/Store/StorePage'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import type { PlanBuilderData } from '@/utilities/planBuilder'
import { MEAL_PLANS_PATH } from '@/utilities/planBuilder'
import { cn } from '@/utilities/ui'
import { whatsappHref } from '@/utilities/whatsapp'

import { focusRing } from './ui'

/** The breadcrumb and the page heading the builder opens on, as the cart and checkout do. */
export function PlanHeader({ data }: { data: PlanBuilderData }) {
  return (
    <>
      <Breadcrumbs
        items={[
          { href: MEAL_PLANS_PATH, label: 'Meal subscription' },
          { label: data.title },
        ]}
      />
      <StorePageHeader
        heading={`Build your ${data.title}`}
        intro={data.description || 'Choose your meals, see this week’s menu and pick your options.'}
      />
    </>
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
