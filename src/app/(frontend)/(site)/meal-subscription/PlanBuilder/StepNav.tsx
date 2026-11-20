import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import React from 'react'

import { cn } from '@/utilities/ui'

import { focusRing, STEPS } from './ui'

type Props = { go: (n: number) => void; step: number; valid: boolean }

/** The three step tabs; later steps stay locked until the plan is valid. */
export function StepNav({ go, step, valid }: Props) {
  return (
    <nav aria-label="Steps">
      <ol className="grid grid-cols-3 gap-2">
        {STEPS.map((st, i) => {
          const done = i < step
          const current = i === step
          return (
            <li key={st.label}>
              <button
                aria-current={current ? 'step' : undefined}
                className={cn('flex w-full flex-col gap-2 rounded-lg pt-1 text-left disabled:cursor-not-allowed', focusRing)}
                disabled={i > step && !valid}
                onClick={() => go(i)}
                type="button"
              >
                <span
                  className={cn(
                    'h-1 w-full rounded-full transition-colors motion-reduce:transition-none',
                    done || current ? 'bg-green-700' : 'bg-line',
                  )}
                />
                <span
                  className={cn(
                    'flex min-h-8 items-center gap-2 text-sm font-bold',
                    current ? 'text-green-700' : done ? 'text-ink-900' : 'text-ink-600',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-full text-xs tabular-nums',
                      done ? 'bg-green-100 text-green-700' : current ? 'text-cream bg-green-700' : 'border-line border-2',
                    )}
                  >
                    {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  {st.label}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Back and next buttons under each step. */
export function StepFooter({ go, step, valid }: Props) {
  return (
    <div className="border-line mt-8 flex items-center justify-between gap-3 border-t pt-6">
      {step > 0 ? (
        <button
          className={cn('rounded-pill inline-flex h-12 items-center gap-2 border-2 border-green-700 px-5 font-bold text-green-700 hover:bg-green-50', focusRing)}
          onClick={() => go(step - 1)}
          type="button"
        >
          <ArrowLeft aria-hidden className="size-4" /> Back
        </button>
      ) : (
        <span />
      )}
      {step < STEPS.length - 1 ? (
        <div className="flex items-center gap-3">
          {!valid && (
            <p className="text-sm text-[#B3261E]" role="status">
              Pick at least one meal.
            </p>
          )}
          <button
            className={cn('rounded-pill inline-flex h-12 items-center gap-2 bg-green-700 px-6 font-bold text-white hover:bg-green-600 disabled:opacity-40', focusRing)}
            disabled={!valid}
            onClick={() => go(step + 1)}
            type="button"
          >
            Next: {STEPS[step + 1].label} <ArrowRight aria-hidden className="size-4" />
          </button>
        </div>
      ) : (
        <p className="text-ink-600 text-sm">Your plan is ready. Add it to your cart from the summary.</p>
      )}
    </div>
  )
}
