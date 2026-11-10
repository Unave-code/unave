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
 * The product card (design.md §6.15) — photo-first and almost chromeless.
 *
 * The photo fills the card and carries the audience and pause pills; the name
 * and the cheapest per-day rate sit on a gradient band along its bottom edge.
 * The whole card is one stretched link to the product's own page, where the
 * durations and totals live, and one hover-revealed gold pill adds the kitchen's
 * default duration. A paused product renders with no control and its lead price
 * readable, and a record without a photo still renders a complete card on the
 * branded placeholder.
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
  subcategory: { id: 5, title: 'Weekly plans', category: 'ready-to-cook' },
  title: 'Lunch plan',
} as unknown as Product

describe('the product card', () => {
  it('is one stretched link carrying the name, the audience pill and the per-day lead', () => {
    render(<ProductCard product={product} />)

    const link = screen.getByRole('link', { name: 'Lunch plan' })
    expect(link.getAttribute('href')).toBe('/products/lunch-plan')
    expect(screen.getByRole('heading', { name: 'Lunch plan' })).toBeTruthy()
    expect(screen.getByText('Kids')).toBeTruthy()

    // The lead price is the cheapest per-day rate floored to whole rupees:
    // ₹499 over 7 days floors to ₹71, ₹1,799 over 30 to ₹59, so ₹59 leads.
    expect(screen.getByText('From ₹59 a day')).toBeTruthy()

    // The durations and their totals live on the product page, not the card.
    expect(screen.queryByText('₹499')).toBeNull()
    expect(screen.queryByText('₹1,799')).toBeNull()
    expect(screen.queryByText('Weekly plans')).toBeNull()
    expect(screen.queryByText('One week')).toBeNull()
  })

  it('renders the placeholder image when the record has no photo', () => {
    const { container } = render(<ProductCard product={product} />)

    const image = container.querySelector('img')

    expect(image).toBeTruthy()
    expect(image?.getAttribute('src')).toContain('product-placeholder.jpg')
  })

  it('offers one Add to cart control that posts the default duration', () => {
    render(<ProductCard product={product} returnPath="/" />)

    const form = screen.getByRole('button', { name: 'Add to cart' }).closest('form')

    expect(form?.getAttribute('action')).toBe('/api/cart/add')
    expect(form?.querySelector('input[name="product"]')?.getAttribute('value')).toBe('lunch-plan')
    expect(form?.querySelector('input[name="duration"]')?.getAttribute('value')).toBe('One week')
    expect(form?.querySelector('input[name="return"]')?.getAttribute('value')).toBe('/')
  })

  it('offers no Add to cart control on a paused product, but keeps its lead price', () => {
    render(<ProductCard product={{ ...product, available: false } as unknown as Product} />)

    expect(screen.queryByRole('button', { name: 'Add to cart' })).toBeNull()
    expect(screen.getByText('Paused')).toBeTruthy()
    expect(screen.getByText('From ₹59 a day')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Lunch plan' })).toBeTruthy()
  })

  it('shows no price and no buy control when the product has no durations', () => {
    render(<ProductCard product={{ ...product, durations: [] } as unknown as Product} />)

    expect(screen.queryByText(/a day/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add to cart' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Lunch plan' })).toBeTruthy()
  })
})
