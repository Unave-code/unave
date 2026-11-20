import { Minus, Plus } from 'lucide-react'
import React from 'react'

import { formatPaise } from '@/utilities/money'
import type { PlanBuilderData } from '@/utilities/planBuilder'
import { PLAN_MAX_PEOPLE } from '@/utilities/planBuilder'
import { cn } from '@/utilities/ui'

import { ChoiceCard, FieldLabel, MEAL_ICON, MEAL_LABEL } from './ui'
import type { PlanBuilderState } from './usePlanBuilder'

/** The shop quantity stepper's buttons (`QuantityStepper`). */
const STEP_BUTTON =
  'flex size-11 shrink-0 items-center justify-center text-green-700 transition-colors hover:bg-green-50 focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none disabled:opacity-40 disabled:hover:bg-transparent motion-reduce:transition-none'

export function PlanStep({ data, state }: { data: PlanBuilderData; state: PlanBuilderState }) {
  const { meals, offered, people, planLabel, setPeople, setPlanLabel, slot, times, toggleMeal } = state
  return (
    <div className="space-y-8">
      <div aria-labelledby="lbl-meals" role="group">
        <FieldLabel
          hint={offered.length > 1 ? 'Choose one or both. We deliver Monday to Saturday.' : `This plan is ${MEAL_LABEL[offered[0]].toLowerCase()} only. We deliver Monday to Saturday.`}
          id="lbl-meals"
        >
          Which meals?
        </FieldLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          {offered.map((m) => {
            const Icon = MEAL_ICON[m]
            return (
              <ChoiceCard
                key={m}
                onClick={() => offered.length > 1 && toggleMeal(m)}
                role="checkbox"
                selected={meals[m]}
              >
                <Icon aria-hidden className="tile-icon text-gold-600 size-6" />
                <span className="mt-1 font-extrabold">{MEAL_LABEL[m]}</span>
                {times[m] && <span className="tile-sub text-ink-600 text-sm">Delivered {times[m]}</span>}
              </ChoiceCard>
            )
          })}
        </div>
      </div>

      <div aria-labelledby="lbl-plan" role="radiogroup">
        <FieldLabel hint="Prices are for one person." id="lbl-plan">
          How long?
        </FieldLabel>
        <div className="grid gap-3 sm:grid-cols-3">
          {data.plans.map((p) => {
            const price = slot ? p.prices[slot] : undefined
            return (
              <ChoiceCard key={p.label} onClick={() => setPlanLabel(p.label)} selected={planLabel === p.label}>
                <span className="font-extrabold">{p.label}</span>
                <span className="tile-sub text-ink-600 text-sm">{p.days} delivery days</span>
                <span className={cn('mt-1 font-extrabold', price ? 'tile-price text-lg text-green-700 tabular-nums' : 'tile-sub text-ink-600 text-sm')}>
                  {price ? formatPaise(price) : 'Not offered for these meals'}
                </span>
                {p.note && <span className="tile-note text-gold-600 text-sm font-bold">{p.note}</span>}
              </ChoiceCard>
            )
          })}
        </div>
      </div>

      <div>
        <FieldLabel hint="Each person gets their own portion." id="lbl-people">
          How many people?
        </FieldLabel>
        <div aria-labelledby="lbl-people" className="border-line rounded-pill inline-flex items-center overflow-hidden border-2 bg-white" role="group">
          <button
            aria-label="One fewer person"
            className={STEP_BUTTON}
            disabled={people <= 1}
            onClick={() => setPeople((p) => p - 1)}
            type="button"
          >
            <Minus aria-hidden className="size-4" strokeWidth={2.5} />
          </button>
          <span aria-live="polite" className="text-ink-900 w-10 text-center font-bold tabular-nums">
            {people}
          </span>
          <button
            aria-label="One more person"
            className={STEP_BUTTON}
            disabled={people >= PLAN_MAX_PEOPLE}
            onClick={() => setPeople((p) => p + 1)}
            type="button"
          >
            <Plus aria-hidden className="size-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  )
}
