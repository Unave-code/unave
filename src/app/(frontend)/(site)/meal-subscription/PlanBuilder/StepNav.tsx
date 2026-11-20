import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import React from 'react'

import { CTA_BASE, CTA_SIZES, CTA_VARIANTS } from '@/components/Cta'
import { cn } from '@/utilities/ui'

import { STEPS } from './ui'

type Props = { go: (n: number) => void; step: number; valid: boolean }

/**
 * The three steps in the cart and checkout strip's look (`CheckoutSteps`): a
 * gold dot on the current step, a green check on finished ones, a quiet ring on
 * the rest. Every step is a button; later steps stay locked until the plan is valid.
 */
export function StepNav({ go, step, valid }: Props) {
  return (
    <nav aria-label="Steps">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
        {STEPS.map((st, i) => {
          const done = i < step
          const current = i === step
          return (
            <li className="flex items-center gap-2" key={st.label}>
              <button
                aria-current={current ? 'step' : undefined}
                className="focus-visible:ring-green-500 rounded-pill inline-flex min-h-11 items-center gap-2 pr-2 underline-offset-4 enabled:hover:underline focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                disabled={i > step && !valid}
                onClick={() => go(i)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors motion-reduce:transition-none',
                    done && 'bg-green-700 text-cream',
                    current && 'bg-gold-400 text-green-900',
                    !done && !current && 'bg-green-50 text-ink-600 ring-line ring-1',
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className={cn('font-semibold', current ? 'text-green-900' : done ? 'text-green-700' : 'text-ink-600')}>
                  {st.label}
                </span>
              </button>
              {i < STEPS.length - 1 ? (
                <span aria-hidden="true" className={cn('h-px w-6 sm:w-10', i < step ? 'bg-green-700' : 'bg-line')} />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Back and next under each step, as the shop's pill buttons. */
export function StepFooter({ go, step, valid }: Props) {
  return (
    <div className="border-line mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
      {step > 0 ? (
        <button className={cn(CTA_BASE, CTA_SIZES.small, CTA_VARIANTS.secondary)} onClick={() => go(step - 1)} type="button">
          <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2.25} /> Back
        </button>
      ) : (
        <span />
      )}
      {step < STEPS.length - 1 ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {!valid && (
            <p className="text-error text-sm" role="status">
              Pick at least one meal.
            </p>
          )}
          <button
            className={cn(CTA_BASE, CTA_VARIANTS.primary, 'disabled:cursor-not-allowed disabled:opacity-40')}
            disabled={!valid}
            onClick={() => go(step + 1)}
            type="button"
          >
            Next: {STEPS[step + 1].label} <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2.25} />
          </button>
        </div>
      ) : (
        <p className="text-ink-600 text-sm">Your plan is ready. Add it to your cart from the summary.</p>
      )}
    </div>
  )
}
