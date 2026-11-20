'use client'

import React, { useEffect, useRef, useState } from 'react'

import type { PlanBuilderData } from '@/utilities/planBuilder'

import { MenuStep } from './MenuStep'
import { OptionsStep } from './OptionsStep'
import { PlanEmpty, PlanHeader } from './Hero'
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
    <main className="container max-w-6xl py-10 pb-28 sm:py-14 lg:pb-14">
      <PlanHeader data={data} />

      {notice && (
        <p className="bg-gold-100 border-gold-300 text-ink-900 mt-8 rounded-2xl border px-5 py-4 text-sm" role="alert">
          {notice}
        </p>
      )}

      <div className="mt-8">
        <StepNav go={go} step={step} valid={valid} />
      </div>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-labelledby="step-heading" className="bg-card min-w-0 rounded-2xl p-6 shadow-sm sm:p-8">
          <h2 className="text-h3 mb-6 text-green-900 outline-none" id="step-heading" ref={headingRef} tabIndex={-1}>
            {STEPS[step].heading}
          </h2>
          <StepBody data={data} state={state} />
          <StepFooter go={go} step={step} valid={valid} />
        </section>

        <SummaryAside data={data} onEdit={onEdit} state={state} whatsapp={whatsapp} />
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
