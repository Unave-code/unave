import { Minus, Plus } from 'lucide-react'
import React from 'react'

import { formatPaise } from '@/utilities/money'
import type { PlanBuilderData } from '@/utilities/planBuilder'
import { PLAN_MAX_PEOPLE } from '@/utilities/planBuilder'
import { cn } from '@/utilities/ui'

import { ChoiceCard, FieldLabel, focusRing, MEAL_ICON, MEAL_LABEL } from './ui'
import type { PlanBuilderState } from './usePlanBuilder'

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
                <Icon aria-hidden className="text-gold-600 size-6" />
                <span className="text-ink-900 mt-1 font-extrabold">{MEAL_LABEL[m]}</span>
                {times[m] && <span className="text-ink-600 text-sm">Delivered {times[m]}</span>}
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
                <span className="text-ink-900 pr-8 font-extrabold">{p.label}</span>
                <span className="text-ink-600 text-sm">{p.days} delivery days</span>
                <span className={cn('mt-1 font-extrabold', price ? 'text-lg text-green-700' : 'text-ink-400 text-sm')}>
                  {price ? formatPaise(price) : 'Not offered for these meals'}
                </span>
                {p.note && <span className="text-gold-600 text-sm font-bold">{p.note}</span>}
              </ChoiceCard>
            )
          })}
        </div>
      </div>

      <div>
        <FieldLabel hint="Each person gets their own portion." id="lbl-people">
          How many people?
        </FieldLabel>
        <div aria-labelledby="lbl-people" className="border-line rounded-pill inline-flex items-center border-2 bg-white" role="group">
          <button
            aria-label="One fewer person"
            className={cn('grid size-12 place-items-center rounded-full hover:bg-green-50 disabled:opacity-40', focusRing)}
            disabled={people <= 1}
            onClick={() => setPeople((p) => p - 1)}
            type="button"
          >
            <Minus aria-hidden className="size-4" />
          </button>
          <span aria-live="polite" className="w-10 text-center text-lg font-extrabold">
            {people}
          </span>
          <button
            aria-label="One more person"
            className={cn('grid size-12 place-items-center rounded-full hover:bg-green-50 disabled:opacity-40', focusRing)}
            disabled={people >= PLAN_MAX_PEOPLE}
            onClick={() => setPeople((p) => p + 1)}
            type="button"
          >
            <Plus aria-hidden className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
