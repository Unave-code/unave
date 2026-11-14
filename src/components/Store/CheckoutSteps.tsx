import { Check } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { cn } from '@/utilities/ui'

const STEPS = [
  { href: '/cart', label: 'Cart' },
  { href: '/checkout', label: 'Details & payment' },
  { href: null, label: 'Done' },
] as const

/**
 * The three-step strip over the cart and the checkout: where the shopper is,
 * what is behind them and what is left. A finished step is a link back and
 * wears a check; the current step is marked `aria-current="step"`; the last
 * step is never a link, because an order is only done once it is paid.
 */
export const CheckoutSteps: React.FC<{ current: 0 | 1 | 2 }> = ({ current }) => (
  <nav aria-label="Checkout progress">
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
      {STEPS.map((step, index) => {
        const done = index < current
        const active = index === current
        const dot = (
          <span
            aria-hidden="true"
            className={cn(
              'grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors',
              done && 'bg-green-700 text-cream',
              active && 'bg-gold-400 text-green-900',
              !done && !active && 'bg-green-50 text-ink-600 ring-line ring-1',
            )}
          >
            {done ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
          </span>
        )
        const body = (
          <>
            {dot}
            <span
              className={cn(
                'font-semibold',
                active ? 'text-green-900' : done ? 'text-green-700' : 'text-ink-600',
              )}
            >
              {step.label}
            </span>
          </>
        )

        return (
          <li className="flex items-center gap-2" key={step.label}>
            {done && step.href ? (
              <Link
                className="focus-visible:ring-green-500 inline-flex min-h-11 items-center gap-2 rounded-pill pr-2 underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
                href={step.href}
              >
                {body}
              </Link>
            ) : (
              <span
                aria-current={active ? 'step' : undefined}
                className="inline-flex min-h-11 items-center gap-2"
              >
                {body}
              </span>
            )}
            {index < STEPS.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn('h-px w-6 sm:w-10', index < current ? 'bg-green-700' : 'bg-line')}
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  </nav>
)
