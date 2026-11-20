import { ChevronUp, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import React from 'react'

import { PRODUCT_PLACEHOLDER } from '@/components/Store/productPlaceholder'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { formatPaise } from '@/utilities/money'
import type { PlanBuilderData } from '@/utilities/planBuilder'
import { cn } from '@/utilities/ui'
import { whatsappHref } from '@/utilities/whatsapp'

import type { PlanBuilderState } from './usePlanBuilder'

/** The chosen plan line by line, each with a link back to the step that sets it, then its price lines. */
export function PlanSummary({ dark, onEdit, state }: { dark: boolean; onEdit: (step: number) => void; state: PlanBuilderState }) {
  const { chosen, people, plan, planPrice, planRows } = state
  return (
    <>
      <dl className="space-y-1 text-sm">
        {planRows.map((r) => (
          <div className="flex min-h-11 items-center gap-3" key={r.label}>
            <dt className={cn('w-16 shrink-0', dark ? 'text-cream/70' : 'text-ink-600')}>{r.label}</dt>
            <dd className={cn('min-w-0 flex-1 font-bold', !dark && 'text-ink-900')}>{r.value}</dd>
            <button
              className={cn(
                'inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-bold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none',
                dark ? 'text-gold-400 focus-visible:ring-gold-400' : 'text-green-700 focus-visible:ring-green-500',
              )}
              onClick={() => onEdit(r.to)}
              type="button"
            >
              Edit<span className="sr-only"> {r.label.toLowerCase()}</span>
            </button>
          </div>
        ))}
      </dl>
      <dl className={cn('mt-4 space-y-2 border-t pt-4 text-sm', dark ? 'border-cream/15' : 'border-line')}>
        <div className="flex justify-between gap-4">
          <dt className={dark ? 'text-cream/75' : 'text-ink-600'}>
            {plan?.label ?? 'Plan'}
            {people > 1 ? ` × ${people}` : ''}
          </dt>
          <dd className={cn('font-bold tabular-nums', !dark && 'text-ink-900')}>{formatPaise(planPrice * people)}</dd>
        </div>
        {chosen
          .filter((c) => c.extraPerDay > 0)
          .map((c) => (
            <div className="flex justify-between gap-4" key={c.label}>
              <dt className={dark ? 'text-cream/75' : 'text-ink-600'}>
                {c.label} × {(plan?.days ?? 0) * people}
              </dt>
              <dd className={cn('font-bold tabular-nums', !dark && 'text-ink-900')}>{formatPaise(c.extraPerDay * (plan?.days ?? 0) * people)}</dd>
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
  dark = true,
  slug,
  state,
}: {
  className?: string
  compact?: boolean
  dark?: boolean
  slug: string
  state: PlanBuilderState
}) {
  const { choices, people, plan, slot, valid } = state
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
          'rounded-pill inline-flex w-full items-center justify-center gap-2 font-bold transition-colors focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-40 motion-reduce:transition-none',
          dark
            ? 'bg-gold-400 hover:bg-gold-500 text-green-700 focus-visible:ring-gold-400'
            : 'text-cream bg-green-700 hover:bg-green-600 focus-visible:ring-green-500',
          compact ? 'h-12 px-5 text-sm' : 'text-button h-13 px-6',
        )}
        disabled={!valid}
        type="submit"
      >
        <ShoppingBag aria-hidden className="size-5" /> Add plan to cart
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

/** The live summary beside the builder on wide screens. */
export function SummaryAside({ data, onEdit, state, whatsapp }: PanelProps) {
  const { message, total } = state
  return (
    <aside aria-labelledby="summary-heading" className="hidden lg:sticky lg:top-24 lg:block">
      <div className="overflow-hidden rounded-2xl bg-white shadow-md">
        <div className="flex items-center gap-3 bg-green-900 p-4">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-green-800">
            <Image alt="" className="object-cover" fill sizes="56px" src={data.image ? getMediaUrl(data.image.url) : PRODUCT_PLACEHOLDER} />
          </div>
          <div className="min-w-0">
            <h2 className="text-cream text-lg font-extrabold" id="summary-heading">
              Your plan
            </h2>
            <p className="text-cream/75 truncate text-sm">{data.title}</p>
          </div>
        </div>
        <div className="p-6 pt-4">
          <PlanSummary dark={false} onEdit={onEdit} state={state} />
          <div className="border-line mt-4 flex items-end justify-between border-t pt-4">
            <span className="text-ink-600 text-sm">Total</span>
            <span aria-live="polite" className="text-3xl font-extrabold text-green-700 tabular-nums">
              {formatPaise(total)}
            </span>
          </div>
          <CartForm className="mt-6" dark={false} slug={data.slug} state={state} />
          <p className="text-ink-600 mt-3 text-center text-sm">Pay securely at checkout. We call you to confirm your start date.</p>
          {whatsapp && (
            <a
              className="mt-2 flex min-h-11 items-center justify-center gap-2 text-sm font-bold text-green-700 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:outline-none"
              href={whatsappHref(whatsapp, message)}
              rel="noopener noreferrer"
              target="_blank"
            >
              <WhatsAppIcon className="size-4" /> Ask us on WhatsApp first
            </a>
          )}
        </div>
      </div>
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
    <div className="border-cream/10 text-cream fixed inset-x-0 bottom-0 z-40 max-h-[80vh] overflow-y-auto border-t bg-green-800 shadow-lg lg:hidden">
      {sheetOpen && (
        <div className="container border-cream/10 border-b py-4" id="mobile-summary">
          <PlanSummary dark onEdit={onEdit} state={state} />
          {whatsapp && (
            <a
              className="text-cream/90 mt-3 flex min-h-11 items-center gap-2 text-sm font-bold underline-offset-4 hover:underline"
              href={whatsappHref(whatsapp, message)}
              rel="noopener noreferrer"
              target="_blank"
            >
              <WhatsAppIcon className="size-4" /> Ask us on WhatsApp first
            </a>
          )}
        </div>
      )}
      <div className="container flex items-center gap-3 py-3">
        <button
          aria-controls="mobile-summary"
          aria-expanded={sheetOpen}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left focus-visible:ring-[3px] focus-visible:ring-gold-400 focus-visible:outline-none"
          onClick={onToggleSheet}
          type="button"
        >
          <span className="min-w-0">
            <span className="text-cream/70 block text-xs">Total</span>
            <span aria-live="polite" className="text-gold-400 block text-xl font-extrabold">
              {formatPaise(total)}
            </span>
          </span>
          <ChevronUp aria-hidden className={cn('size-5 shrink-0 transition-transform motion-reduce:transition-none', !sheetOpen && 'rotate-180')} />
          <span className="sr-only">{sheetOpen ? 'Hide' : 'Show'} plan details</span>
        </button>
        <CartForm className="shrink-0" compact slug={data.slug} state={state} />
      </div>
    </div>
  )
}
