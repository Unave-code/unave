import { cleanup, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProductShelf } from '@/components/Store/ProductShelf'
import { ProductShelfControls } from '@/components/Store/ProductShelfControls'
import type { Product } from '@/payload-types'
import {
  EMPTY_SHELF,
  hasShelfFilters,
  parseShelfState,
  shelfHref,
  shelfWhere,
  type ShelfState,
} from '@/utilities/productShelf'

// Next's image optimizer needs the Next runtime; a card only cares that an image
// element renders, so it is a plain img here, exactly as the card test does.
vi.mock('next/image', () => ({
  default: ({
    fill,
    priority,
    ...rest
  }: React.ComponentProps<'img'> & { fill?: boolean; priority?: boolean }) =>
    React.createElement('img', rest),
}))

/**
 * The shelf's controls and its state (design.md §6.19).
 *
 * Search, filters, sort and paging all travel in the address, so the rules are
 * held here: what the address is allowed to mean, what an address is written
 * back as, what the database is asked for, and what the controls render. The
 * facets are links and the rest is one plain `GET` form, which is why the
 * controls can be rendered and read without a browser.
 */

afterEach(cleanup)

const renderControls = (
  state: Partial<ShelfState> = {},
  props: Partial<React.ComponentProps<typeof ProductShelfControls>> = {},
) =>
  render(
    <ProductShelfControls
      basePath="/products"
      state={{ ...EMPTY_SHELF, ...state }}
      subcategories={[{ id: '12', label: 'Breakfast' }]}
      {...props}
    />,
  )

describe('reading the address', () => {
  it('asks nothing of a bare shelf: everything, newest first, page one', () => {
    expect(parseShelfState({})).toEqual(EMPTY_SHELF)
  })

  it('believes a real filter, a real sort and a real page', () => {
    expect(
      parseShelfState({
        audience: 'kids',
        category: 'ready-to-cook',
        from: '50',
        page: '3',
        q: '  dal  ',
        sort: 'price-asc',
        subcategory: '12',
        to: '150',
        type: 'plan',
      }),
    ).toEqual({
      audience: 'kids',
      category: 'ready-to-cook',
      from: 50,
      page: 3,
      q: 'dal',
      sort: 'price-asc',
      subcategory: '12',
      to: 150,
      type: 'plan',
    })
  })

  it('drops anything it cannot believe rather than failing the page', () => {
    expect(
      parseShelfState({
        audience: 'aliens',
        category: 'lunch-plan',
        from: 'cheap',
        page: '0',
        sort: 'cheapest',
        subcategory: 'ready-to-cook',
        to: '-5',
        type: 'subscription',
      }),
    ).toEqual(EMPTY_SHELF)
  })

  it('reads audience=all as no filter, because All shows every product', () => {
    expect(parseShelfState({ audience: 'all' }).audience).toBeNull()
  })

  it('takes the last of a parameter an address repeats', () => {
    expect(parseShelfState({ audience: ['kids', 'adults'] }).audience).toBe('adults')
  })

  it('accepts zero as a real low end and keeps a page of one or more', () => {
    expect(parseShelfState({ from: '0' }).from).toBe(0)
    expect(parseShelfState({ page: '1' }).page).toBe(1)
  })

  it('trims a search to the length the field accepts', () => {
    expect(parseShelfState({ q: 'x'.repeat(200) }).q).toHaveLength(80)
  })
})

describe('writing the address', () => {
  it('is the bare shelf when nothing is asked', () => {
    expect(shelfHref('/products', EMPTY_SHELF)).toBe('/products')
  })

  it('writes what is asked and nothing else', () => {
    const state: ShelfState = { ...EMPTY_SHELF, audience: 'kids', page: 2, q: 'dal', sort: 'price-asc' }

    expect(shelfHref('/products', state)).toBe('/products?q=dal&audience=kids&sort=price-asc&page=2')
  })

  it('starts a new filter over at page one', () => {
    expect(shelfHref('/products', { ...EMPTY_SHELF, page: 4 }, { audience: 'kids' })).toBe(
      '/products?audience=kids',
    )
  })

  it('keeps the page when the page is the change', () => {
    expect(shelfHref('/products', { ...EMPTY_SHELF, audience: 'kids' }, { page: 3 })).toBe(
      '/products?audience=kids&page=3',
    )
  })

  it('keeps the page it names when asked for the view as it stands', () => {
    expect(shelfHref('/products', { ...EMPTY_SHELF, page: 3, q: 'dal' })).toBe('/products?q=dal&page=3')
  })

  it('clears one facet without clearing the others', () => {
    expect(shelfHref('/products', { ...EMPTY_SHELF, audience: 'kids', subcategory: '12' }, { audience: null })).toBe(
      '/products?subcategory=12',
    )
  })

  it('keeps a category page inside itself', () => {
    expect(shelfHref('/products/ready-to-cook', { ...EMPTY_SHELF, audience: 'kids' })).toBe(
      '/products/ready-to-cook?audience=kids',
    )
  })
})

describe('what counts as filtered', () => {
  it('is false for a bare shelf, category pages included', () => {
    expect(hasShelfFilters(EMPTY_SHELF)).toBe(false)
    expect(hasShelfFilters(EMPTY_SHELF, 'ready-to-cook')).toBe(false)
  })

  it('is true once anything is asked', () => {
    expect(hasShelfFilters({ ...EMPTY_SHELF, q: 'dal' })).toBe(true)
    expect(hasShelfFilters({ ...EMPTY_SHELF, from: 0 })).toBe(true)
  })

  it('counts a category only where the page is not already that category', () => {
    expect(hasShelfFilters({ ...EMPTY_SHELF, category: 'ready-to-cook' }, 'ready-to-cook')).toBe(false)
    expect(hasShelfFilters({ ...EMPTY_SHELF, category: 'ready-to-eat' }, 'ready-to-cook')).toBe(true)
  })
})

describe('the query the shelf reads by', () => {
  it('asks for nothing at all when nothing is asked', () => {
    expect(shelfWhere(EMPTY_SHELF)).toEqual({})
  })

  it('pins a category page to its own category, whatever the address says', () => {
    expect(shelfWhere({ ...EMPTY_SHELF, category: 'ready-to-eat' }, 'ready-to-cook')).toEqual({
      and: [{ category: { equals: 'ready-to-cook' } }],
    })
  })

  it('reads a price range in rupees as paise, inclusive at both ends', () => {
    expect(shelfWhere({ ...EMPTY_SHELF, from: 50, to: 150 })).toEqual({
      and: [
        { fromPrice: { greater_than_equal: 5000 } },
        { fromPrice: { less_than_equal: 15000 } },
      ],
    })
  })

  it('searches the name and the points, because the description is rich text', () => {
    expect(shelfWhere({ ...EMPTY_SHELF, q: 'dal' })).toEqual({
      and: [{ or: [{ title: { like: 'dal' } }, { 'points.point': { like: 'dal' } }] }],
    })
  })

  it('reads every facet at once', () => {
    expect(
      shelfWhere({ ...EMPTY_SHELF, audience: 'kids', subcategory: '12', type: 'plan' }),
    ).toEqual({
      and: [
        { audience: { equals: 'kids' } },
        { type: { equals: 'plan' } },
        { subcategory: { equals: '12' } },
      ],
    })
  })
})

describe('the shelf controls', () => {
  it('labels every facet group and starts each on All', () => {
    renderControls()

    for (const name of ['Category', 'Audience', 'Type', 'Section']) {
      const group = screen.getByRole('group', { name })

      expect(within(group).getByRole('link', { name: 'All' }).getAttribute('aria-current')).toBe('true')
    }

    expect(within(screen.getByRole('group', { name: 'Category' })).getByRole('link', { name: 'Ready to eat' })).toBeTruthy()
    expect(within(screen.getByRole('group', { name: 'Type' })).getByRole('link', { name: 'Meal plans' })).toBeTruthy()
    expect(within(screen.getByRole('group', { name: 'Section' })).getByRole('link', { name: 'Breakfast' })).toBeTruthy()
  })

  it('drops the category row on a category page, where the page is the category', () => {
    renderControls({}, { basePath: '/products/ready-to-cook', fixedCategory: 'ready-to-cook' })

    expect(screen.queryByRole('group', { name: 'Category' })).toBeNull()
    expect(screen.getByRole('group', { name: 'Audience' })).toBeTruthy()
  })

  it('marks the chosen facet current and keeps the others in the link', () => {
    renderControls({ audience: 'kids', q: 'dal' })

    const kids = within(screen.getByRole('group', { name: 'Audience' })).getByRole('link', {
      name: 'Kids',
    })

    expect(kids.getAttribute('aria-current')).toBe('true')
    expect(kids.getAttribute('href')).toBe('/products?q=dal&audience=kids')
  })

  it('applies one plain GET form to the shelf, carrying the chosen facets', () => {
    const { container } = renderControls({ audience: 'kids', subcategory: '12', type: 'plan' })

    const form = container.querySelector('form')
    expect(form?.getAttribute('method')).toBe('get')
    expect(form?.getAttribute('action')).toBe('/products')

    const hidden = [...container.querySelectorAll('input[type="hidden"]')].map((input) =>
      input.getAttribute('name'),
    )
    expect(hidden.sort()).toEqual(['audience', 'subcategory', 'type'])
  })

  it('shows the words, the range and the sort that are already in force', () => {
    renderControls({ from: 50, q: 'dal', sort: 'price-asc', to: 150 })

    expect((screen.getByLabelText('Search the shelf') as HTMLInputElement).value).toBe('dal')
    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('50')
    expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('150')
    expect((screen.getByLabelText('Sort by') as HTMLSelectElement).value).toBe('price-asc')

    expect(within(screen.getByLabelText('Sort by')).getAllByRole('option')).toHaveLength(4)
  })

  it('sends Clear all back to the bare shelf', () => {
    renderControls({ audience: 'kids', q: 'dal' })

    expect(screen.getByRole('link', { name: 'Clear all' }).getAttribute('href')).toBe('/products')
  })

  it('carries the category through the form on the catalogue', () => {
    const { container } = renderControls({ category: 'ready-to-eat' })

    const hidden = [...container.querySelectorAll('input[type="hidden"]')]
    expect(hidden.map((input) => input.getAttribute('value'))).toEqual(['ready-to-eat'])
  })
})

describe('the shelf', () => {
  const product = {
    available: true,
    audience: 'kids',
    category: 'ready-to-cook',
    durations: [{ days: 7, id: 'd1', label: 'One week', price: 49900 }],
    fromPrice: 7100,
    id: 1,
    slug: 'lunch-plan',
    title: 'Lunch plan',
  } as unknown as Product

  const shelf = (
    overrides: Partial<React.ComponentProps<typeof ProductShelf>> = {},
  ): React.ReactElement => (
    <ProductShelf
      basePath="/products"
      result={{ docs: [product], page: 1, totalDocs: 30, totalPages: 3 }}
      state={EMPTY_SHELF}
      subcategories={[]}
      whatsapp={null}
      {...overrides}
    />
  )

  it('says where in the shelf the page sits', () => {
    render(shelf())

    expect(screen.getByText('Showing 1–12 of 30 products')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Lunch plan' })).toBeTruthy()
  })

  it('pages on links that keep the filters', () => {
    render(shelf({ state: { ...EMPTY_SHELF, q: 'dal' } }))

    expect(
      screen.getByRole('link', { name: 'Next page' }).getAttribute('href'),
    ).toBe('/products?q=dal&page=2')
  })

  it('says what a paused product means when one is on the page', () => {
    render(shelf({ result: { docs: [{ ...product, available: false }], page: 1, totalDocs: 1, totalPages: 1 } }))

    expect(screen.getByText('What "paused" means')).toBeTruthy()
  })

  it('offers the way back to the whole shelf when the filters matched nothing', () => {
    render(
      shelf({
        result: { docs: [], page: 1, totalDocs: 0, totalPages: 0 },
        state: { ...EMPTY_SHELF, q: 'nothing' },
      }),
    )

    expect(screen.getByText('Nothing matches those filters')).toBeTruthy()

    const clears = screen.getAllByRole('link', { name: 'Clear all' })
    expect(clears.some((link) => link.getAttribute('href') === '/products')).toBe(true)
  })

  it('says the shelf is empty, not the filters, when there is nothing to show', () => {
    render(shelf({ result: { docs: [], page: 1, totalDocs: 0, totalPages: 0 } }))

    expect(screen.getByText('No products are open right now')).toBeTruthy()
    expect(screen.queryByText('Nothing matches those filters')).toBeNull()
  })
})
