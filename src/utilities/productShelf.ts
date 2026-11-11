import configPromise from '@payload-config'
import { getPayload } from 'payload'
import type { Where } from 'payload'

import type { Product } from '@/payload-types'
import {
  AUDIENCE_FILTER_ORDER,
  isProductCategory,
  type ProductAudienceFilterValue,
  type ProductCategoryValue,
} from '@/utilities/productsCategoryCopy'

/**
 * The shelf: one set of search, filter, sort and page rules (design.md §6.19).
 *
 * `/products` and the three category pages are the same shelf reading the same
 * collection, so every rule about what a customer can ask for lives here once.
 * The state travels in the address — `?q=&audience=&from=&sort=&page=2` — which
 * means a filtered view can be linked, bookmarked, reloaded and stepped through
 * with the back button, and the whole thing works with JavaScript off.
 *
 * The queries themselves are plain Payload `find` calls, so a page is a real
 * database query with a limit, not a filtered list of everything.
 */

/** How many products one page of the shelf holds: four rows of three on a wide screen. */
export const SHELF_PER_PAGE = 12

/* ------------------------------------------------------------------ search */

/** The longest search a customer can make. Anything longer is trimmed, not refused. */
const SEARCH_MAX_LENGTH = 80

/* -------------------------------------------------------------------- sort */

export type ShelfSortKey = 'name' | 'newest' | 'price-asc' | 'price-desc'

export const SHELF_SORT_ORDER: ShelfSortKey[] = ['newest', 'price-asc', 'price-desc', 'name']

export const SHELF_SORT_LABEL: Record<ShelfSortKey, string> = {
  name: 'Name A–Z',
  newest: 'Newest first',
  'price-asc': 'Price, low to high',
  'price-desc': 'Price, high to low',
}

/**
 * What each sort asks the database for. `-available` leads every one of them,
 * so a paused product stays under the products to buy however the shelf is
 * sorted: the label is a footnote, not a reason to lead.
 */
const SHELF_SORT_QUERY: Record<ShelfSortKey, string[]> = {
  name: ['-available', 'title'],
  newest: ['-available', '-createdAt'],
  'price-asc': ['-available', 'fromPrice', '-createdAt'],
  'price-desc': ['-available', '-fromPrice', '-createdAt'],
}

/* ------------------------------------------------------------------- state */

export interface ShelfState {
  audience: null | ProductAudienceFilterValue
  category: null | ProductCategoryValue
  /** The low end of the price range, in whole rupees a day. */
  from: null | number
  page: number
  q: string
  sort: ShelfSortKey
  /** The high end of the price range, in whole rupees a day. */
  to: null | number
}

/** The shelf with nothing asked of it: the whole catalogue, newest first, page one. */
export const EMPTY_SHELF: ShelfState = {
  audience: null,
  category: null,
  from: null,
  page: 1,
  q: '',
  sort: 'newest',
  to: null,
}

/** The address map Next hands a page, before anything is believed. */
export type ShelfSearchParams = Record<string, string | string[] | undefined>

/**
 * The last of a repeated parameter wins. Nothing this site writes repeats one,
 * but a hand typed address can, and the last is the one a person meant.
 */
const firstValue = (value: string | string[] | undefined): undefined | string => {
  if (Array.isArray(value)) return value[value.length - 1]

  return value
}

/** A whole number of rupees, or nothing. `0` is a real low end; "abc" is not. */
const wholeRupees = (raw: undefined | string): null | number => {
  if (raw === undefined || raw.trim() === '') return null

  const value = Number(raw)

  return Number.isInteger(value) && value >= 0 ? value : null
}

const wholePage = (raw: undefined | string): number => {
  const value = Number(raw)

  return Number.isInteger(value) && value >= 1 ? value : 1
}

/**
 * Reading the address into a shelf. Everything is validated and anything
 * unrecognised is dropped, so a mangled URL shows the whole shelf rather than
 * an error page.
 */
export const parseShelfState = (raw: ShelfSearchParams = {}): ShelfState => {
  const audienceRaw = firstValue(raw.audience)
  const categoryRaw = firstValue(raw.category)
  const sortRaw = firstValue(raw.sort)

  return {
    audience:
      audienceRaw && audienceRaw !== 'all' && (AUDIENCE_FILTER_ORDER as readonly string[]).includes(audienceRaw)
        ? (audienceRaw as ProductAudienceFilterValue)
        : null,
    category: categoryRaw && isProductCategory(categoryRaw) ? categoryRaw : null,
    from: wholeRupees(firstValue(raw.from)),
    page: wholePage(firstValue(raw.page)),
    q: (firstValue(raw.q) ?? '').trim().slice(0, SEARCH_MAX_LENGTH),
    sort:
      sortRaw && (SHELF_SORT_ORDER as string[]).includes(sortRaw)
        ? (sortRaw as ShelfSortKey)
        : 'newest',
    to: wholeRupees(firstValue(raw.to)),
  }
}

/* ------------------------------------------------------------------ writing */

/**
 * The address of a shelf view. Any change starts over at page one unless the
 * change is the page itself, so a filter can never leave a customer on a page
 * that no longer exists.
 */
export const shelfHref = (
  basePath: string,
  state: ShelfState,
  overrides: Partial<ShelfState> = {},
): string => {
  const next: ShelfState = { ...state, ...overrides }
  const changed = Object.keys(overrides).length > 0

  /* Changing anything but the page starts the shelf over at its first page, so
     a filter can never leave a customer on a page that no longer exists. Asking
     for the state as it stands (a return address) keeps the page it names. */
  if (changed && overrides.page === undefined) next.page = 1

  const params = new URLSearchParams()

  if (next.q) params.set('q', next.q)
  if (next.category) params.set('category', next.category)
  if (next.audience) params.set('audience', next.audience)
  if (next.from !== null) params.set('from', String(next.from))
  if (next.to !== null) params.set('to', String(next.to))
  if (next.sort !== 'newest') params.set('sort', next.sort)
  if (next.page > 1) params.set('page', String(next.page))

  const query = params.toString()

  return query ? `${basePath}?${query}` : basePath
}

/** Whether the customer has asked for anything at all. */
export const hasShelfFilters = (state: ShelfState, fixedCategory?: ProductCategoryValue): boolean =>
  Boolean(
    state.q ||
      state.audience ||
      state.from !== null ||
      state.to !== null ||
      (state.category && state.category !== fixedCategory),
  )

/* ------------------------------------------------------------------- query */

/**
 * The `where` the shelf reads by. A category page pins its own category, so the
 * one in the address is ignored there: the address can never widen a shelf past
 * the page it is on.
 */
export const shelfWhere = (
  state: ShelfState,
  fixedCategory?: ProductCategoryValue,
): Where => {
  const and: Where[] = []
  const category = fixedCategory ?? state.category

  if (category) and.push({ category: { equals: category } })
  if (state.audience) and.push({ audience: { equals: state.audience } })
  if (state.from !== null) and.push({ fromPrice: { greater_than_equal: state.from * 100 } })
  if (state.to !== null) and.push({ fromPrice: { less_than_equal: state.to * 100 } })

  /* The words search the product's name and its points. The description is a
     rich text column and Postgres cannot pattern match it without raw SQL, so
     the field says "name or a point" rather than promising more. */
  if (state.q) {
    and.push({
      or: [{ title: { like: state.q } }, { 'points.point': { like: state.q } }],
    })
  }

  return and.length > 0 ? { and } : {}
}

export interface ShelfResult {
  docs: Product[]
  page: number
  totalDocs: number
  totalPages: number
}

/** One page of the shelf, read live so a price the kitchen saves is here at once. */
export const fetchProductShelf = async (
  state: ShelfState,
  fixedCategory?: ProductCategoryValue,
): Promise<ShelfResult> => {
  const payload = await getPayload({ config: configPromise })

  const query = {
    collection: 'products' as const,
    depth: 1 as const,
    limit: SHELF_PER_PAGE,
    sort: SHELF_SORT_QUERY[state.sort],
    where: shelfWhere(state, fixedCategory),
  }

  let result = await payload.find({ ...query, page: state.page })

  /* A page past the end — a stale link, a hand typed address — steps back to
     the last real one rather than showing an empty shelf that is not empty. */
  if (result.totalDocs > 0 && state.page > result.totalPages) {
    result = await payload.find({ ...query, page: result.totalPages })
  }

  return {
    docs: result.docs as Product[],
    page: result.page ?? state.page,
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
  }
}
