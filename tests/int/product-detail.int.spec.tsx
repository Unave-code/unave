import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProductDetail } from '@/components/Store/ProductDetail'
import type { Product } from '@/payload-types'

// RichText drags Payload's admin styles (.scss) into the test; the page's own
// behavior is what these tests hold, so the renderer is stubbed.
vi.mock('@/components/RichText', () => ({
  default: () => React.createElement('div', { 'data-testid': 'rich-text' }),
}))

// Next's image optimizer needs the Next runtime; the page only cares that it
// renders an image element with the right source, so it is a plain img here.
vi.mock('next/image', () => ({
  default: ({
    fill,
    priority,
    ...rest
  }: React.ComponentProps<'img'> & { fill?: boolean; priority?: boolean }) =>
    React.createElement('img', rest),
}))

/**
 * A product's own page (design.md §6.15), the room the simplified card opens.
 *
 * The page carries what the card gave up: the category and audience badges, the
 * description, the points and the price panel where the durations lead into the
 * cart. A paused product renders in full with nothing to add.
 */

afterEach(cleanup)

const openProduct = {
  available: true,
  audience: 'kids',
  category: 'ready-to-cook',
  description: { root: { children: [] } },
  durations: [{ days: 7, id: 'd1', label: 'One week', price: 49900 }],
  id: 1,
  points: [{ point: 'Prepped and ready' }],
  slug: 'lunch-plan',
  title: 'Lunch plan',
} as unknown as Product

describe('a product page', () => {
  it('leads with the name, the badges, the price panel and its points', () => {
    render(<ProductDetail product={openProduct} whatsapp="+919000000000" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Lunch plan' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Browse Ready to cook products' })).toBeTruthy()
    expect(screen.getByText('Kids')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeTruthy()
    expect(screen.getByText('Prepped and ready')).toBeTruthy()
  })

  it('links back to the shelf and on to the product category', () => {
    render(<ProductDetail product={openProduct} />)

    expect(screen.getByRole('link', { name: 'All products' }).getAttribute('href')).toBe('/products')
    expect(
      screen.getByRole('link', { name: 'Browse Ready to cook products' }).getAttribute('href'),
    ).toBe('/products/ready-to-cook')
  })

  it('shows a paused product in full, with nothing to add', () => {
    render(<ProductDetail product={{ ...openProduct, available: false } as unknown as Product} />)

    expect(screen.getByText('Paused')).toBeTruthy()
    expect(screen.getByText(/This product is paused right now/)).toBeTruthy()
    expect(screen.getByText('₹499')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add to cart' })).toBeNull()
  })
})
