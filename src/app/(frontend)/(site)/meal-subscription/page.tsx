import type { Metadata } from 'next'
import React from 'react'

import { getCachedGlobal } from '@/utilities/getGlobals'
import { normalizePlanBuilder } from '@/utilities/planBuilder'
import type { Footer } from '@/payload-types'

import { PlanBuilder } from './PlanBuilder'

export const metadata: Metadata = {
  alternates: { canonical: '/meal-subscription' },
  description: 'Pick your meals and plan length, see the weekly menu, choose your options, then pay securely.',
  title: 'Build your meal plan',
}

const NOTICES: Record<string, string> = {
  changed: 'Something in the plan changed since you opened this page. Please check your choices and try again.',
  unknown: 'That did not go through. Please try again.',
}

/**
 * The plan builder: everything on it (menu, prices, options, text) comes from
 * the Plan builder global, edited under Catalogue in the admin.
 */
export default async function PlanBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>
}) {
  const [doc, footer, params] = await Promise.all([
    getCachedGlobal('plan-builder', 0)(),
    getCachedGlobal('footer', 1)() as Promise<Footer | null>,
    searchParams,
  ])

  return (
    <PlanBuilder
      data={normalizePlanBuilder(doc)}
      notice={params.notice ? (NOTICES[params.notice] ?? NOTICES.unknown) : null}
      whatsapp={footer?.contact?.whatsapp ?? null}
    />
  )
}
