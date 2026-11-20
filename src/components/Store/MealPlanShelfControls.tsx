import React from 'react'

import {
  MEAL_PLAN_SORT_LABEL,
  MEAL_PLAN_SORT_ORDER,
  MEALS_FILTER_LABEL,
  type MealPlanShelfState,
} from '@/utilities/mealPlanShelf'
import { PLAN_SLOTS } from '@/utilities/planBuilder'

import { FacetSelect, type FacetOption, PriceRange, ShelfActions, ShelfSearch, SortSelect } from './ShelfFields'

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
    <ShelfSearch label="Search meal plans" placeholder='A plan or a dish, for example "paneer"' value={state.q} />

    {audiences.length > 0 ? <FacetSelect label="For" name="audience" options={audiences} value={state.audience} /> : null}

    <FacetSelect
      label="Meals"
      name="meals"
      options={PLAN_SLOTS.map((slot) => ({ label: MEALS_FILTER_LABEL[slot], value: slot }))}
      value={state.meals}
    />

    <PriceRange
      from={state.from}
      fromLabel="Price from"
      fromPlaceholder="₹ From"
      label="Price for one person (₹)"
      to={state.to}
      toLabel="Price to"
      toPlaceholder="₹ To"
      width="w-24"
    />

    <SortSelect label="Sort by" labels={MEAL_PLAN_SORT_LABEL} order={MEAL_PLAN_SORT_ORDER} value={state.sort} />

    <ShelfActions applyLabel="Apply" clearHref={basePath} clearLabel="Clear all" />
  </form>
)
