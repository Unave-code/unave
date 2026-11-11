import { Search } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { CTA_BASE, CTA_SIZES, CTA_VARIANTS } from '@/components/Cta'
import { AUTH_INPUT, AUTH_INPUT_LEADING, AUTH_LABEL } from '@/components/CustomerAuth/styles'
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
  SHELF_TYPE_LABEL,
  SHELF_TYPE_ORDER,
  shelfHref,
  type ShelfState,
  type ShelfSubcategoryOption,
} from '@/utilities/productShelf'
import {
  SHELF_APPLY,
  SHELF_CLEAR,
  SHELF_FILTER_ALL,
  SHELF_FILTER_AUDIENCE,
  SHELF_FILTER_CATEGORY,
  SHELF_FILTER_SECTION,
  SHELF_FILTER_TYPE,
  SHELF_PRICE_FROM,
  SHELF_PRICE_LABEL,
  SHELF_PRICE_TO,
  SHELF_SEARCH_LABEL,
  SHELF_SEARCH_PLACEHOLDER,
  SHELF_SORT_FIELD_LABEL,
} from '@/utilities/productsCopy'

/**
 * The controls above a shelf: search, filters, price and sort (design.md §6.19).
 *
 * It is deliberately a slim bar, not a panel: the facets are one compact line
 * each with their name inline, and the search, the price range, the sort and
 * the two actions share the single row below, so the controls never take over
 * the page they sit on.
 *
 * Every choice is an ordinary link or a form field, and every one writes the
 * address. So a filtered shelf can be linked, bookmarked, reloaded and stepped
 * back through, and the whole bar works with JavaScript off: the facets are
 * links, and the form is a plain `GET`.
 *
 * The facets are links because each one is a complete view on its own, and a
 * link cannot leave a second copy of the same parameter behind. The form then
 * carries the chosen facets as hidden fields, so applying a price or a sort
 * never drops the filters around it. Each control keeps its accessible name
 * (the search, the sort and both price boxes carry `aria-label`; the price pair
 * is a labelled group), and every target is at least 44px (design.md §6.2).
 */

interface Pill {
  active: boolean
  href: string
  label: string
}

const PILL =
  'rounded-pill focus-visible:ring-green-500 inline-flex h-11 items-center border px-3 text-sm font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none'

const PILL_ON = 'border-green-700 bg-green-700 text-cream'
const PILL_OFF =
  'border-green-200 bg-green-50 text-green-800 hover:border-green-700 hover:bg-green-100'

const pillClass = (active: boolean) => `${PILL} ${active ? PILL_ON : PILL_OFF}`

/**
 * One facet: its name beside its choices, all on a single line. The label sits
 * inline rather than above, which keeps four facets from reading as eight rows,
 * and the pills are green on the panel's cream so the row reads as one control.
 */
const Facet: React.FC<{ label: string; options: Pill[] }> = ({ label, options }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
    <p className={cn(AUTH_LABEL, 'text-ink-600 w-20 shrink-0')}>{label}</p>

    <div aria-label={label} className="flex flex-wrap items-center gap-1.5" role="group">
      {options.map((option) => (
        <Link
          aria-current={option.active ? 'true' : undefined}
          className={pillClass(option.active)}
          href={option.href}
          key={option.href}
        >
          {option.label}
        </Link>
      ))}
    </div>
  </div>
)

export const ProductShelfControls: React.FC<{
  /** The shelf's own address, which is also where its form applies to. */
  basePath: string
  /** Set on a category page, where the category is the page and not a choice. */
  fixedCategory?: ProductCategoryValue
  state: ShelfState
  subcategories: ShelfSubcategoryOption[]
}> = ({ basePath, fixedCategory, state, subcategories }) => {
  /** The "All" pill every facet leads with: the same view with that facet cleared. */
  const allPill = (href: string, active: boolean): Pill => ({
    active,
    href,
    label: SHELF_FILTER_ALL,
  })

  const categoryPills: Pill[] = [
    allPill(shelfHref(basePath, state, { category: null }), state.category === null),
    ...PRODUCT_CATEGORY_VALUES.map((value) => ({
      active: state.category === value,
      href: shelfHref(basePath, state, { category: value }),
      label: CATEGORY_LABEL[value],
    })),
  ]

  const audiencePills: Pill[] = [
    allPill(shelfHref(basePath, state, { audience: null }), state.audience === null),
    ...AUDIENCE_FILTER_ORDER.filter((value) => value !== 'all').map((value) => ({
      active: state.audience === value,
      href: shelfHref(basePath, state, { audience: value }),
      label: AUDIENCE_FILTER_LABEL[value],
    })),
  ]

  const typePills: Pill[] = [
    allPill(shelfHref(basePath, state, { type: null }), state.type === null),
    ...SHELF_TYPE_ORDER.map((value) => ({
      active: state.type === value,
      href: shelfHref(basePath, state, { type: value }),
      label: SHELF_TYPE_LABEL[value],
    })),
  ]

  const sectionPills: Pill[] = [
    allPill(shelfHref(basePath, state, { subcategory: null }), state.subcategory === null),
    ...subcategories.map((option) => ({
      active: state.subcategory === option.id,
      href: shelfHref(basePath, state, { subcategory: option.id }),
      label: option.label,
    })),
  ]

  const clearHref = shelfHref(basePath, EMPTY_SHELF)

  return (
    <div className="mt-8 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        {fixedCategory ? null : <Facet label={SHELF_FILTER_CATEGORY} options={categoryPills} />}

        <Facet label={SHELF_FILTER_AUDIENCE} options={audiencePills} />

        <Facet label={SHELF_FILTER_TYPE} options={typePills} />

        {subcategories.length > 0 ? (
          <Facet label={SHELF_FILTER_SECTION} options={sectionPills} />
        ) : null}
      </div>

      {/* The facets above are links, so the form carries whichever of them is
          chosen: applying a price or a sort keeps the filters around it. */}
      <form action={basePath} className="flex flex-wrap items-center gap-2" method="get">
        {fixedCategory || !state.category ? null : (
          <input name="category" type="hidden" value={state.category} />
        )}
        {state.audience ? <input name="audience" type="hidden" value={state.audience} /> : null}
        {state.type ? <input name="type" type="hidden" value={state.type} /> : null}
        {state.subcategory ? (
          <input name="subcategory" type="hidden" value={state.subcategory} />
        ) : null}

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
    </div>
  )
}
