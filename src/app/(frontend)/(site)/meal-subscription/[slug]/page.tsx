import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React, { cache } from 'react'

import { getCachedGlobal } from '@/utilities/getGlobals'
import { mealPlanPath, normalizeMealPlan, withCurrentWeek } from '@/utilities/planBuilder'
import type { Footer } from '@/payload-types'

import { PlanBuilder } from '../PlanBuilder'

const NOTICES: Record<string, string> = {
  changed: 'Something in this plan changed since you opened the page. Please check your choices and try again.',
  unknown: 'That did not go through. Please try again.',
}

const findPlan = cache(async (slug: string) => {
  const payload = await getPayload({ config: configPromise })
  const found = await payload.find({
    collection: 'meal-plans',
    depth: 1,
    limit: 1,
    where: { slug: { equals: slug.slice(0, 100) } },
  })
  return found.docs[0] ?? null
})

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const doc = await findPlan(slug)
  if (!doc) return { title: 'Meal plan not found' }
  return {
    alternates: { canonical: mealPlanPath(doc.slug) },
    description: doc.description ?? undefined,
    title: `${doc.title} meal plan`,
  }
}

/** One meal plan's builder: its own menu, lengths, prices, options and delivery times. */
export default async function MealPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ notice?: string }>
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const doc = await findPlan(slug)
  if (!doc) notFound()

  const footer = (await getCachedGlobal('footer', 1)()) as Footer | null

  return (
    <PlanBuilder
      data={withCurrentWeek(normalizeMealPlan(doc))}
      notice={query.notice ? (NOTICES[query.notice] ?? NOTICES.unknown) : null}
      whatsapp={footer?.contact?.whatsapp ?? null}
    />
  )
}
