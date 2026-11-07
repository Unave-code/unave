import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProductCard } from '@/components/Store/ProductCard'
import type { Product } from '@/payload-types'

// Next's image optimizer needs the Next runtime; the card only cares that it
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
 * The product card (design.md §6.15).
 *
 * Photo, name and the first duration's price, then one Add to cart control for
 * exactly that duration. Flat by design: a 1px line, no shadow. Open and buy are
 * two separate controls — the photo, name and price are one link to the
 * product's own page, and the button posts the shown line to the cart. A paused
 * product renders the card with no button at all, and the photo falls back to a
 * branded placeholder so a record without one still renders a complete card.
 */

afterEach(cleanup)

const product = {
  available: true,
  audience: 'kids',
  category: 'ready-to-cook',
  durations: [
    { days: 7, id: 'd1', label: 'One week', price: 49900 },
    { days: 30, id: 'd2', label: 'One month', price: 179900 },
  ],
  id: 1,
  slug: 'lunch-plan',
  title: 'Lunch plan',
} as unknown as Product

describe('the product card', () => {
  it('shows the name and the first duration price, and links to the product page', () => {
    render(<ProductCard product={product} />)

    const link = screen.getByRole('link', { name: /Lunch plan/ })
    expect(link.getAttribute('href')).toBe('/products/lunch-plan')
    expect(screen.getByRole('heading', { name: 'Lunch plan' })).toBeTruthy()
    expect(screen.getByText('₹499')).toBeTruthy()
    expect(screen.getByText('One week')).toBeTruthy()

    // Only the first duration is represented on the card.
    expect(screen.queryByText('₹1,799')).toBeNull()
  })

  it('renders the placeholder image when the record has no photo', () => {
    const { container } = render(<ProductCard product={product} />)

    const image = container.querySelector('img')

    expect(image).toBeTruthy()
    expect(image?.getAttribute('src')).toContain('product-placeholder.jpg')
  })

  it('offers one Add to cart control that posts the shown line', () => {
    render(<ProductCard product={product} returnPath="/" />)

    const form = screen.getByRole('button', { name: 'Add to cart' }).closest('form')

    expect(form?.getAttribute('action')).toBe('/api/cart/add')
    expect(form?.querySelector('input[name="product"]')?.getAttribute('value')).toBe('lunch-plan')
    expect(form?.querySelector('input[name="duration"]')?.getAttribute('value')).toBe('One week')
    expect(form?.querySelector('input[name="return"]')?.getAttribute('value')).toBe('/')
  })

  it('offers no Add to cart control on a paused product', () => {
    render(<ProductCard product={{ ...product, available: false } as unknown as Product} />)

    expect(screen.queryByRole('button', { name: 'Add to cart' })).toBeNull()
    expect(screen.getByRole('link', { name: /Lunch plan/ })).toBeTruthy()
  })

  it('shows no price when the product has no durations', () => {
    render(<ProductCard product={{ ...product, durations: [] } as unknown as Product} />)

    expect(screen.queryByText('₹499')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Lunch plan' })).toBeTruthy()
  })
})
