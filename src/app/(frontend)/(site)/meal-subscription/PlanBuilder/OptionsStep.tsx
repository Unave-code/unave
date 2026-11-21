import { Sparkles } from 'lucide-react'
import React from 'react'

import { formatPaise } from '@/utilities/money'
import type { PlanBuilderData } from '@/utilities/planBuilder'
import { cn } from '@/utilities/ui'

import { ChoiceCard } from './ui'
import type { PlanBuilderState } from './usePlanBuilder'

export function OptionsStep({ data, state }: { data: PlanBuilderData; state: PlanBuilderState }) {
  const { choices, choose } = state
  return (
    <div className="space-y-8">
      {data.optionGroups.length === 0 && <p className="text-ink-600">No add-ons for this plan. Your plan is ready.</p>}
      {data.optionGroups.map((g, gi) => (
        <div aria-labelledby={`lbl-opt-${gi}`} key={g.title} role="group">
          <div className="mb-3 flex items-start gap-3">
            <span className="bg-gold-100 grid size-10 shrink-0 place-items-center rounded-xl">
              <Sparkles aria-hidden className="text-gold-600 size-5" />
            </span>
            <div>
              <h3 className="text-ink-900 font-extrabold" id={`lbl-opt-${gi}`}>
                {g.title}
              </h3>
              <p className="text-ink-600 text-sm">{g.hint || 'Add as many as you like, or none.'}</p>
            </div>
          </div>
          <div className={cn('grid gap-3', g.choices.length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
            {g.choices.map((c, ci) => (
              <ChoiceCard key={c.label} onClick={() => choose(gi, ci)} role="checkbox" selected={(choices[gi] ?? []).includes(ci)}>
                <span className="font-extrabold">{c.label}</span>
                {c.detail && <span className="tile-sub text-ink-600 text-sm">{c.detail}</span>}
                <span className={cn('mt-auto pt-1 text-sm font-bold', c.extraPerDay ? 'tile-price text-green-700' : 'tile-sub text-ink-600')}>
                  {c.extraPerDay ? `+${formatPaise(c.extraPerDay)} a day` : 'Included'}
                </span>
              </ChoiceCard>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
