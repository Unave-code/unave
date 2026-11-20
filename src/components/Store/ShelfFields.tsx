import { Search } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { CTA_BASE, CTA_SIZES, CTA_VARIANTS } from '@/components/Cta'
import { AUTH_INPUT, AUTH_INPUT_LEADING } from '@/components/CustomerAuth/styles'
import { SHELF_FILTER_ALL } from '@/utilities/productsCopy'
import { cn } from '@/utilities/ui'

/**
 * The fields both shelves' search bars are built from (design.md §6.19): one
 * `GET` form, so every control works with JavaScript off and every target is
 * at least 44px.
 */

/** One choice in a facet select: the value the address carries and its word. */
export interface FacetOption {
  label: string
  value: string
}

/** One facet as a select, its name inline before it. */
export const FacetSelect: React.FC<{
  label: string
  name: string
  options: FacetOption[]
  value: null | string
}> = ({ label, name, options, value }) => (
  <div className="flex items-center gap-2">
    <span className="text-ink-600 text-sm font-semibold">{label}</span>

    <select
      aria-label={label}
      className={cn(AUTH_INPUT, 'w-auto pr-8 pl-3')}
      defaultValue={value ?? ''}
      name={name}
    >
      <option value="">{SHELF_FILTER_ALL}</option>

      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
)

/** The free-text search, with its icon inside the field. */
export const ShelfSearch: React.FC<{ label: string; placeholder: string; value: string }> = ({
  label,
  placeholder,
  value,
}) => (
  <div className="relative min-w-[12rem] flex-1">
    <Search
      aria-hidden="true"
      className="text-ink-400 pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
    />

    <input
      aria-label={label}
      className={cn(AUTH_INPUT, AUTH_INPUT_LEADING)}
      defaultValue={value}
      maxLength={80}
      name="q"
      placeholder={placeholder}
      type="search"
    />
  </div>
)

/** The from and to price boxes, in rupees. */
export const PriceRange: React.FC<{
  from: null | number | string
  fromLabel: string
  fromPlaceholder: string
  label: string
  to: null | number | string
  toLabel: string
  toPlaceholder: string
  /** The width class of each box. */
  width: string
}> = ({ from, fromLabel, fromPlaceholder, label, to, toLabel, toPlaceholder, width }) => (
  <div aria-label={label} className="flex items-center gap-1.5" role="group">
    <input
      aria-label={fromLabel}
      className={cn(AUTH_INPUT, width, 'px-3')}
      defaultValue={from ?? ''}
      inputMode="numeric"
      min={0}
      name="from"
      placeholder={fromPlaceholder}
      type="number"
    />

    <span aria-hidden="true" className="text-ink-400">
      –
    </span>

    <input
      aria-label={toLabel}
      className={cn(AUTH_INPUT, width, 'px-3')}
      defaultValue={to ?? ''}
      inputMode="numeric"
      min={0}
      name="to"
      placeholder={toPlaceholder}
      type="number"
    />
  </div>
)

/** The sort order, as a select. */
export const SortSelect = <K extends string>({
  label,
  labels,
  order,
  value,
}: {
  label: string
  labels: Record<K, string>
  order: readonly K[]
  value: K
}) => (
  <select aria-label={label} className={cn(AUTH_INPUT, 'w-auto pr-8 pl-3')} defaultValue={value} name="sort">
    {order.map((key) => (
      <option key={key} value={key}>
        {labels[key]}
      </option>
    ))}
  </select>
)

/** Apply, then the way back to the whole shelf. */
export const ShelfActions: React.FC<{ applyLabel: string; clearHref: string; clearLabel: string }> = ({
  applyLabel,
  clearHref,
  clearLabel,
}) => (
  <>
    <button className={cn(CTA_BASE, CTA_SIZES.small, CTA_VARIANTS.primary)} type="submit">
      {applyLabel}
    </button>

    <Link
      className="text-ink-600 hover:text-green-700 rounded-pill focus-visible:ring-green-500 inline-flex h-11 items-center px-3 text-sm font-semibold underline underline-offset-4 transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none"
      href={clearHref}
    >
      {clearLabel}
    </Link>
  </>
)
