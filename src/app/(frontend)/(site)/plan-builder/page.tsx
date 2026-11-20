import type { Metadata } from 'next'
import React from 'react'

import { getCachedGlobal } from '@/utilities/getGlobals'
import type { Footer } from '@/payload-types'

import { PlanBuilder } from './PlanBuilder'

export const metadata: Metadata = {
  title: 'Build your meal plan',
  description: 'Pick your meals, protein and days, see the price, then message us to start.',
  robots: { index: false, follow: false },
}

/** Throwaway prototype of a weekly plan builder. Static data, no CMS, no checkout. */
export default async function PlanBuilderPage() {
  const footer = (await getCachedGlobal('footer', 1)()) as Footer | null
  return <PlanBuilder whatsapp={footer?.contact?.whatsapp ?? null} />
}
