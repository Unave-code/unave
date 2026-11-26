import React from 'react'

import { formatPaise } from '@/utilities/money'
import { mealPickPrice, type PlanBuilderData } from '@/utilities/planBuilder'
import { cn } from '@/utilities/ui'

import { ChoiceCard, FieldLabel, MEAL_ICON, MEAL_LABEL } from './ui'
import type { PlanBuilderState } from './usePlanBuilder'

export function PlanStep({ data, state }: { data: PlanBuilderData; state: PlanBuilderState }) {
  const { meals, offered, pick, planLabel, setPlanLabel, times, toggleMeal } = state
  const anyPicked = pick.breakfast || pick.slot !== null
  return (
    <div className="space-y-8">
      <div aria-labelledby="lbl-meals" role="group">
        <FieldLabel
          hint={offered.length > 1 ? `Choose ${offered.length > 2 ? 'any of them' : 'one or both'}. We deliver Monday to Saturday.` : `This plan is ${MEAL_LABEL[offered[0]].toLowerCase()} only. We deliver Monday to Saturday.`}
          id="lbl-meals"
        >
          Which meals?
        </FieldLabel>
        <div className={cn('grid gap-3', offered.length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
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
            const price = anyPicked ? mealPickPrice(p, pick) : undefined
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

    </div>
  )
}
