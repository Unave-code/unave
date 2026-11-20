import { Search } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { CTA_BASE, CTA_SIZES, CTA_VARIANTS } from '@/components/Cta'
import { AUTH_INPUT, AUTH_INPUT_LEADING } from '@/components/CustomerAuth/styles'
import {
  MEAL_PLAN_SORT_LABEL,
  MEAL_PLAN_SORT_ORDER,
  MEALS_FILTER_LABEL,
  type MealPlanShelfState,
} from '@/utilities/mealPlanShelf'
import { PLAN_SLOTS } from '@/utilities/planBuilder'
import { cn } from '@/utilities/ui'

import type { FacetOption } from './ProductShelfControls'

/** One facet as a select, its name inline before it, as on the products shelf. */
const FacetSelect: React.FC<{ label: string; name: string; options: FacetOption[]; value: null | string }> = ({
  label,
  name,
  options,
  value,
}) => (
  <div className="flex items-center gap-2">
    <span className="text-ink-600 text-sm font-semibold">{label}</span>
    <select aria-label={label} className={cn(AUTH_INPUT, 'w-auto pr-8 pl-3')} defaultValue={value ?? ''} name={name}>
      <option value="">All</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
)

/**
 * The meal plan shelf's search bar, the same one-row `GET` form the products
 * shelf uses (design.md §6.19): search, audience, meals, price for one person,
 * sort, then Apply. Works with JavaScript off; every target is at least 44px.
 */
export const MealPlanShelfControls: React.FC<{
  audiences: FacetOption[]
  basePath: string
  state: MealPlanShelfState
}> = ({ audiences, basePath, state }) => (
  <form action={basePath} className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2" method="get">
    <div className="relative min-w-[12rem] flex-1">
      <Search aria-hidden="true" className="text-ink-400 pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2" />
      <input
        aria-label="Search meal plans"
        className={cn(AUTH_INPUT, AUTH_INPUT_LEADING)}
        defaultValue={state.q}
        maxLength={80}
        name="q"
        placeholder='A plan or a dish, for example "paneer"'
        type="search"
      />
    </div>

    {audiences.length > 0 ? <FacetSelect label="For" name="audience" options={audiences} value={state.audience} /> : null}

    <FacetSelect
      label="Meals"
      name="meals"
      options={PLAN_SLOTS.map((slot) => ({ label: MEALS_FILTER_LABEL[slot], value: slot }))}
      value={state.meals}
    />

    <div aria-label="Price for one person (₹)" className="flex items-center gap-1.5" role="group">
      <input
        aria-label="Price from"
        className={cn(AUTH_INPUT, 'w-24 px-3')}
        defaultValue={state.from ?? ''}
        inputMode="numeric"
        min={0}
        name="from"
        placeholder="₹ From"
        type="number"
      />
      <span aria-hidden="true" className="text-ink-400">
        –
      </span>
      <input
        aria-label="Price to"
        className={cn(AUTH_INPUT, 'w-24 px-3')}
        defaultValue={state.to ?? ''}
        inputMode="numeric"
        min={0}
        name="to"
        placeholder="₹ To"
        type="number"
      />
    </div>

    <select aria-label="Sort by" className={cn(AUTH_INPUT, 'w-auto pr-8 pl-3')} defaultValue={state.sort} name="sort">
      {MEAL_PLAN_SORT_ORDER.map((key) => (
        <option key={key} value={key}>
          {MEAL_PLAN_SORT_LABEL[key]}
        </option>
      ))}
    </select>

    <button className={cn(CTA_BASE, CTA_SIZES.small, CTA_VARIANTS.primary)} type="submit">
      Apply
    </button>

    <Link
      className="text-ink-600 hover:text-green-700 rounded-pill focus-visible:ring-green-500 inline-flex h-11 items-center px-3 text-sm font-semibold underline underline-offset-4 transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none"
      href={basePath}
    >
      Clear all
    </Link>
  </form>
)
