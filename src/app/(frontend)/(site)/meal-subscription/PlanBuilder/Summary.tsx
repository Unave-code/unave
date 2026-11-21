import { ChevronUp, ShieldCheck, ShoppingBag } from 'lucide-react'
import React from 'react'

import { CTA_BASE, CTA_SIZES, CTA_VARIANTS } from '@/components/Cta'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { formatPaise } from '@/utilities/money'
import type { PlanBuilderData } from '@/utilities/planBuilder'
import { cn } from '@/utilities/ui'
import { whatsappHref } from '@/utilities/whatsapp'

import { STEPS } from './ui'
import type { PlanBuilderState } from './usePlanBuilder'

const WHATSAPP_LINK =
  'flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold text-green-700 underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none'

/** The chosen plan line by line, each with a link back to the step that sets it, then its price lines. */
export function PlanSummary({ onEdit, state }: { onEdit: (step: number) => void; state: PlanBuilderState }) {
  const { chosen, people, plan, planPrice, planRows } = state
  return (
    <>
      <dl className="flex flex-col text-sm">
        {planRows.map((r) => (
          <div className="flex min-h-11 items-center gap-3" key={r.label}>
            <dt className="text-ink-600 w-16 shrink-0">{r.label}</dt>
            <dd className="text-ink-900 min-w-0 flex-1 font-semibold">{r.value}</dd>
            <button
              aria-label={`Edit ${r.label.toLowerCase()}`}
              className="focus-visible:ring-green-500 inline-flex min-h-11 shrink-0 items-center rounded-sm px-1 text-sm font-semibold text-green-700 underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
              onClick={() => onEdit(r.to)}
              type="button"
            >
              Edit
            </button>
          </div>
        ))}
      </dl>
      <dl className="border-line mt-4 flex flex-col gap-3 border-t pt-4 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink-600">
            {plan?.label ?? 'Plan'}
            {people > 1 ? ` × ${people}` : ''}
          </dt>
          <dd className="text-ink-900 font-semibold tabular-nums">{formatPaise(planPrice * people)}</dd>
        </div>
        {chosen
          .filter((c) => c.extraPerDay > 0)
          .map((c) => (
            <div className="flex items-center justify-between gap-4" key={c.label}>
              <dt className="text-ink-600">
                {c.label} × {(plan?.days ?? 0) * people}
              </dt>
              <dd className="text-ink-900 font-semibold tabular-nums">
                {formatPaise(c.extraPerDay * (plan?.days ?? 0) * people)}
              </dd>
            </div>
          ))}
      </dl>
    </>
  )
}

/** The form that puts the plan in the cart; the server prices it again from the admin. */
export function CartForm({
  className,
  compact = false,
  slug,
  state,
}: {
  className?: string
  compact?: boolean
  slug: string
  state: PlanBuilderState
}) {
  const { choices, people, plan, slot, step, valid } = state
  // Only on the last step, so every choice has been seen before it goes in the cart.
  const ready = valid && step === STEPS.length - 1
  return (
    <form action="/api/cart/plan" className={className} method="post">
      <input name="slot" type="hidden" value={slot ?? ''} />
      <input name="plan" type="hidden" value={plan?.label ?? ''} />
      <input name="people" type="hidden" value={people} />
      <input name="mealPlan" type="hidden" value={slug} />
      {choices.map((c, i) => (
        <input key={i} name={`choice-${i}`} type="hidden" value={c} />
      ))}
      <button
        className={cn(
          CTA_BASE,
          compact ? CTA_SIZES.small : '',
          CTA_VARIANTS.primary,
          'w-full disabled:cursor-not-allowed disabled:opacity-40',
        )}
        disabled={!ready}
        title={ready ? undefined : `Finish the steps first: the cart opens on ${STEPS[STEPS.length - 1].label}.`}
        type="submit"
      >
        <ShoppingBag aria-hidden className="size-4" strokeWidth={2} /> Add plan to cart
      </button>
    </form>
  )
}

type PanelProps = {
  data: PlanBuilderData
  onEdit: (step: number) => void
  state: PlanBuilderState
  whatsapp: null | string
}

/** The live summary beside the builder on wide screens, in the cart summary's card. */
export function SummaryAside({ data, onEdit, state, whatsapp }: PanelProps) {
  const { message, total } = state
  return (
    <aside
      aria-labelledby="summary-heading"
      className="bg-card hidden rounded-2xl p-6 shadow-sm sm:p-7 lg:sticky lg:top-28 lg:block"
    >
      <h2 className="text-lg font-bold text-green-900" id="summary-heading">
        Your plan
      </h2>
      <p className="text-ink-600 mt-1 truncate text-sm">{data.title}</p>

      <div className="mt-4">
        <PlanSummary onEdit={onEdit} state={state} />
      </div>

      <div className="border-line mt-4 flex items-baseline justify-between gap-4 border-t pt-4">
        <p className="text-ink-900 text-base font-bold">Total</p>
        <p aria-live="polite" className="text-[28px] leading-none font-extrabold text-green-900 tabular-nums">
          {formatPaise(total)}
        </p>
      </div>

      <CartForm className="mt-6" slug={data.slug} state={state} />

      <p className="text-ink-600 mt-5 flex items-start gap-2 text-sm leading-6">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-green-700" strokeWidth={2} />
        Pay securely at checkout. We call you to confirm your start date.
      </p>
      {whatsapp && (
        <a className={cn(WHATSAPP_LINK, 'mt-2')} href={whatsappHref(whatsapp, message)} rel="noopener noreferrer" target="_blank">
          <WhatsAppIcon className="size-4" /> Ask us on WhatsApp first
        </a>
      )}
    </aside>
  )
}

/** The live total pinned to the bottom of small screens, opening into the full summary. */
export function MobileSummaryBar({
  data,
  onEdit,
  onToggleSheet,
  sheetOpen,
  state,
  whatsapp,
}: PanelProps & { onToggleSheet: () => void; sheetOpen: boolean }) {
  const { message, total } = state
  return (
    <div className="bg-card border-line fixed inset-x-0 bottom-0 z-40 max-h-[80vh] overflow-y-auto border-t shadow-lg lg:hidden">
      {sheetOpen && (
        <div className="container border-line border-b py-4" id="mobile-summary">
          <PlanSummary onEdit={onEdit} state={state} />
          {whatsapp && (
            <a className={cn(WHATSAPP_LINK, 'mt-3')} href={whatsappHref(whatsapp, message)} rel="noopener noreferrer" target="_blank">
              <WhatsAppIcon className="size-4" /> Ask us on WhatsApp first
            </a>
          )}
        </div>
      )}
      <div className="container flex items-center gap-3 py-3">
        <button
          aria-controls="mobile-summary"
          aria-expanded={sheetOpen}
          className="focus-visible:ring-green-500 flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-sm text-left focus-visible:ring-[3px] focus-visible:outline-none"
          onClick={onToggleSheet}
          type="button"
        >
          <span className="min-w-0">
            <span className="text-ink-600 block text-xs">Total</span>
            <span aria-live="polite" className="block text-xl font-extrabold text-green-900 tabular-nums">
              {formatPaise(total)}
            </span>
          </span>
          <ChevronUp
            aria-hidden
            className={cn('size-5 shrink-0 text-green-700 transition-transform motion-reduce:transition-none', !sheetOpen && 'rotate-180')}
          />
          <span className="sr-only">{sheetOpen ? 'Hide' : 'Show'} plan details</span>
        </button>
        <CartForm className="w-auto shrink-0" compact slug={data.slug} state={state} />
      </div>
    </div>
  )
}
