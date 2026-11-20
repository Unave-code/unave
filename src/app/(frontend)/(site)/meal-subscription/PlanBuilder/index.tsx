'use client'

import React, { useEffect, useRef, useState } from 'react'

import type { PlanBuilderData } from '@/utilities/planBuilder'

import { MenuStep } from './MenuStep'
import { OptionsStep } from './OptionsStep'
import { PlanEmpty, PlanHero } from './Hero'
import { PlanStep } from './PlanStep'
import { StepFooter, StepNav } from './StepNav'
import { MobileSummaryBar, SummaryAside } from './Summary'
import { STEPS } from './ui'
import { usePlanBuilder } from './usePlanBuilder'

const STEP_BODY = [PlanStep, MenuStep, OptionsStep]

export function PlanBuilder({
  data,
  notice,
  whatsapp,
}: {
  data: PlanBuilderData
  notice: null | string
  whatsapp: null | string
}) {
  const state = usePlanBuilder(data)
  const { go, step, valid } = state
  const [sheetOpen, setSheetOpen] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  // Move focus to the new step heading so keyboard and screen reader users land in the right place.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus()
  }, [step])

  if (!data.plans.length || !data.thisWeek) return <PlanEmpty whatsapp={whatsapp} />

  const onEdit = (to: number) => {
    go(to)
    setSheetOpen(false)
  }
  const StepBody = STEP_BODY[step]

  return (
    <main className="pb-28 lg:pb-0">
      <PlanHero data={data} state={state} />

      <div className="scroll-mt-20 bg-green-50" id="builder">
        <div className="container grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:py-12">
          <div className="min-w-0 space-y-8">
            {notice && (
              <p className="bg-gold-100 border-gold-300 text-ink-900 rounded-2xl border px-5 py-4 text-sm" role="alert">
                {notice}
              </p>
            )}

            <section aria-labelledby="step-heading" className="rounded-2xl bg-white p-5 shadow-md sm:p-8">
              <StepNav go={go} step={step} valid={valid} />
              <h2 className="text-ink-900 mt-6 mb-6 text-2xl font-extrabold outline-none" id="step-heading" ref={headingRef} tabIndex={-1}>
                {STEPS[step].heading}
              </h2>
              <StepBody data={data} state={state} />
              <StepFooter go={go} step={step} valid={valid} />
            </section>
          </div>

          <SummaryAside data={data} onEdit={onEdit} state={state} whatsapp={whatsapp} />
        </div>
      </div>

      <MobileSummaryBar
        data={data}
        onEdit={onEdit}
        onToggleSheet={() => setSheetOpen((o) => !o)}
        sheetOpen={sheetOpen}
        state={state}
        whatsapp={whatsapp}
      />
    </main>
  )
}
