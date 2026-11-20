import React from 'react'

import {
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
  PRODUCT_KIND_FILTER_LABEL,
  PRODUCT_KIND_ORDER,
  SHELF_FILTER_AUDIENCE,
  SHELF_FILTER_KIND,
  SHELF_FILTER_CATEGORY,
  SHELF_PRICE_FROM,
  SHELF_PRICE_LABEL,
  SHELF_PRICE_TO,
  SHELF_SEARCH_LABEL,
  SHELF_SEARCH_PLACEHOLDER,
  SHELF_SORT_FIELD_LABEL,
} from '@/utilities/productsCopy'

import { FacetSelect, type FacetOption, PriceRange, ShelfActions, ShelfSearch, SortSelect } from './ShelfFields'

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

export type { FacetOption } from './ShelfFields'

export const ProductShelfControls: React.FC<{
  /** The shelf's own address, which is also where its form applies to. */
  /** The audiences staff keep in the admin, as filter choices. */
  audiences?: FacetOption[]
  basePath: string
  /** Set on a category page, where the category is the page and not a choice. */
  fixedCategory?: ProductCategoryValue
  state: ShelfState
}> = ({ audiences = [], basePath, fixedCategory, state }) => {
  const categoryOptions: FacetOption[] = PRODUCT_CATEGORY_VALUES.map((value) => ({
    label: CATEGORY_LABEL[value],
    value,
  }))

  const clearHref = shelfHref(basePath, EMPTY_SHELF)

  return (
    <form
      action={basePath}
      className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2"
      method="get"
    >
      {state.subcategory ? (
        <input name="subcategory" type="hidden" value={state.subcategory} />
      ) : null}

      <ShelfSearch label={SHELF_SEARCH_LABEL} placeholder={SHELF_SEARCH_PLACEHOLDER} value={state.q} />

      {fixedCategory ? null : (
        <FacetSelect
          label={SHELF_FILTER_CATEGORY}
          name="category"
          options={categoryOptions}
          value={state.category}
        />
      )}

      <FacetSelect
        label={SHELF_FILTER_KIND}
        name="kind"
        options={PRODUCT_KIND_ORDER.map((value) => ({
          label: PRODUCT_KIND_FILTER_LABEL[value],
          value,
        }))}
        value={state.kind}
      />

      {audiences.length > 0 ? (
        <FacetSelect
          label={SHELF_FILTER_AUDIENCE}
          name="audience"
          options={audiences}
          value={state.audience}
        />
      ) : null}

      <PriceRange
        from={state.from}
        fromLabel={SHELF_PRICE_FROM}
        fromPlaceholder={SHELF_PRICE_FROM}
        label={SHELF_PRICE_LABEL}
        to={state.to}
        toLabel={SHELF_PRICE_TO}
        toPlaceholder={SHELF_PRICE_TO}
        width="w-20"
      />

      <SortSelect
        label={SHELF_SORT_FIELD_LABEL}
        labels={SHELF_SORT_LABEL}
        order={SHELF_SORT_ORDER}
        value={state.sort}
      />

      <ShelfActions applyLabel={SHELF_APPLY} clearHref={clearHref} clearLabel={SHELF_CLEAR} />
    </form>
  )
}
