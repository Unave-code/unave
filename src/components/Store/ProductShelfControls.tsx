import { Search } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { CTA_BASE, CTA_SIZES, CTA_VARIANTS } from '@/components/Cta'
import { AUTH_INPUT, AUTH_INPUT_LEADING } from '@/components/CustomerAuth/styles'
import { cn } from '@/utilities/ui'
import {
  AUDIENCE_FILTER_LABEL,
  AUDIENCE_FILTER_ORDER,
  CATEGORY_LABEL,
  PRODUCT_CATEGORY_VALUES,
  type ProductCategoryValue,
} from '@/utilities/productsCategoryCopy'
import {
  EMPTY_SHELF,
  SHELF_SORT_LABEL,
  SHELF_SORT_ORDER,
  shelfHref,
  type ShelfState,
} from '@/utilities/productShelf'
import {
  SHELF_APPLY,
  SHELF_CLEAR,
  SHELF_FILTER_ALL,
  SHELF_FILTER_AUDIENCE,
  SHELF_FILTER_CATEGORY,
  SHELF_PRICE_FROM,
  SHELF_PRICE_LABEL,
  SHELF_PRICE_TO,
  SHELF_SEARCH_LABEL,
  SHELF_SEARCH_PLACEHOLDER,
  SHELF_SORT_FIELD_LABEL,
} from '@/utilities/productsCopy'

/**
 * The shelf's search bar: the search field, the filters, the price range, the
 * sort and the two actions all in one row (design.md §6.19).
 *
 * The filters are `<select>`s inside the one `GET` form rather than a stack of
 * pill links, so there is no second copy of a parameter to keep in step and the
 * whole bar is a single server round trip that works with JavaScript off:
 * choose, then *Apply*.
 *
 * Each select carries its name both as a visible label and as its `aria-label`,
 * and the search, the sort and both price boxes carry theirs as `aria-label`
 * only, which keeps the row to a line; every target is at least 44px
 * (design.md §6.2).
 */

/** One choice in a facet select: the value the address carries and its word. */
interface FacetOption {
  label: string
  value: string
}

/** One facet as a select, its name inline before it. */
const FacetSelect: React.FC<{
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

export const ProductShelfControls: React.FC<{
  /** The shelf's own address, which is also where its form applies to. */
  basePath: string
  /** Set on a category page, where the category is the page and not a choice. */
  fixedCategory?: ProductCategoryValue
  state: ShelfState
}> = ({ basePath, fixedCategory, state }) => {
  const categoryOptions: FacetOption[] = PRODUCT_CATEGORY_VALUES.map((value) => ({
    label: CATEGORY_LABEL[value],
    value,
  }))

  const audienceOptions: FacetOption[] = AUDIENCE_FILTER_ORDER.filter(
    (value) => value !== 'all',
  ).map((value) => ({ label: AUDIENCE_FILTER_LABEL[value], value }))

  const clearHref = shelfHref(basePath, EMPTY_SHELF)

  return (
    <form
      action={basePath}
      className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2"
      method="get"
    >
      <div className="relative min-w-[12rem] flex-1">
        <Search
          aria-hidden="true"
          className="text-ink-400 pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
        />

        <input
          aria-label={SHELF_SEARCH_LABEL}
          className={cn(AUTH_INPUT, AUTH_INPUT_LEADING)}
          defaultValue={state.q}
          maxLength={80}
          name="q"
          placeholder={SHELF_SEARCH_PLACEHOLDER}
          type="search"
        />
      </div>

      {fixedCategory ? null : (
        <FacetSelect
          label={SHELF_FILTER_CATEGORY}
          name="category"
          options={categoryOptions}
          value={state.category}
        />
      )}

      <FacetSelect
        label={SHELF_FILTER_AUDIENCE}
        name="audience"
        options={audienceOptions}
        value={state.audience}
      />

      <div aria-label={SHELF_PRICE_LABEL} className="flex items-center gap-1.5" role="group">
        <input
          aria-label={SHELF_PRICE_FROM}
          className={cn(AUTH_INPUT, 'w-20 px-3')}
          defaultValue={state.from ?? ''}
          inputMode="numeric"
          min={0}
          name="from"
          placeholder={SHELF_PRICE_FROM}
          type="number"
        />

        <span aria-hidden="true" className="text-ink-400">
          –
        </span>

        <input
          aria-label={SHELF_PRICE_TO}
          className={cn(AUTH_INPUT, 'w-20 px-3')}
          defaultValue={state.to ?? ''}
          inputMode="numeric"
          min={0}
          name="to"
          placeholder={SHELF_PRICE_TO}
          type="number"
        />
      </div>

      <select
        aria-label={SHELF_SORT_FIELD_LABEL}
        className={cn(AUTH_INPUT, 'w-auto pr-8 pl-3')}
        defaultValue={state.sort}
        name="sort"
      >
        {SHELF_SORT_ORDER.map((key) => (
          <option key={key} value={key}>
            {SHELF_SORT_LABEL[key]}
          </option>
        ))}
      </select>

      <button className={cn(CTA_BASE, CTA_SIZES.small, CTA_VARIANTS.primary)} type="submit">
        {SHELF_APPLY}
      </button>

      <Link
        className="text-ink-600 hover:text-green-700 rounded-pill focus-visible:ring-green-500 inline-flex h-11 items-center px-3 text-sm font-semibold underline underline-offset-4 transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none"
        href={clearHref}
      >
        {SHELF_CLEAR}
      </Link>
    </form>
  )
}
