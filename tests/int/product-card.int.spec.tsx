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
  it('links the name to the product page and shows the audience pill and per-day lead', () => {
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

  it('layers the second photo over the first, hidden until the card is pointed at', () => {
    const photo = (id: number) => ({
      alt: `Photo ${id}`,
      filename: `p${id}.jpg`,
      height: 800,
      id,
      mimeType: 'image/jpeg',
      updatedAt: '2026-11-16T00:00:00.000Z',
      url: `/media/p${id}.jpg`,
      width: 800,
    })
    const withPhotos = {
      ...product,
      gallery: [{ id: 'g1', image: photo(2) }],
      image: photo(1),
    } as unknown as Product

    const { container } = render(<ProductCard product={withPhotos} />)
    const sources = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))

    expect(sources.some((src) => src?.includes('p1.jpg'))).toBe(true)
    expect(sources.some((src) => src?.includes('p2.jpg'))).toBe(true)
    expect(container.querySelector('.group-hover\\:opacity-100')).toBeTruthy()
  })

  it('renders the placeholder image when the record has no photo', () => {
    const { container } = render(<ProductCard product={product} />)

    const image = container.querySelector('img')

    expect(image).toBeTruthy()
    expect(image?.getAttribute('src')).toContain('product-placeholder.jpg')
  })

  it('sends a meal plan to its page to choose a duration, adding nothing itself', () => {
    render(<ProductCard product={product} returnPath="/" />)

    const choose = screen.getByRole('link', { name: 'Choose plan for Lunch plan' })
    expect(choose.getAttribute('href')).toBe('/products/lunch-plan')
    expect(screen.queryByRole('button', { name: /to cart/ })).toBeNull()
    expect(screen.getByText('Meal plan')).toBeTruthy()
  })

  it('adds a one-time product straight from the card', () => {
    const oneTime = {
      ...product,
      durations: [],
      price: 4900,
      slug: 'phulka-box',
      title: 'Phulka box',
      type: 'one-time',
    } as unknown as Product
    render(<ProductCard product={oneTime} returnPath="/" />)

    const form = screen.getByRole('button', { name: 'Add Phulka box to cart' }).closest('form')
    expect(form?.querySelector('input[name="duration"]')?.getAttribute('value')).toBe('one-time')
    expect(screen.getByRole('button', { name: 'Buy Phulka box now' })).toBeTruthy()
    expect(screen.getByText('One-time purchase')).toBeTruthy()
  })

  it('leads a sized product with its cheapest size and sends it to choose one', () => {
    const sized = {
      ...product,
      durations: [],
      price: 9900,
      sizes: [
        { id: 's1', label: '250 g', price: 9900 },
        { id: 's2', label: '500 g', price: 18000 },
      ],
      slug: 'sambar-podi',
      title: 'Sambar podi',
      type: 'one-time',
    } as unknown as Product
    render(<ProductCard product={sized} />)

    expect(screen.getByText('From ₹99')).toBeTruthy()
    expect(screen.getByText('250 g · 500 g')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Choose size for Sambar podi' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /to cart/ })).toBeNull()
  })

  it('shows a combo’s items, its separate price struck through and the saving', () => {
    const plan = {
      ...product,
      durations: [{ days: 7, id: 'w', label: 'One week', price: 50000 }],
      id: 11,
      type: 'plan',
    }
    const box = { ...product, durations: [], id: 12, price: 10000, title: 'Phulka box', type: 'one-time' }
    const combo = {
      ...product,
      components: [
        { durationLabel: 'One week', id: 'c1', product: plan },
        { id: 'c2', product: box },
      ],
      durations: [],
      price: 52000,
      slug: 'family-combo',
      title: 'Family combo',
      type: 'combo',
    } as unknown as Product
    render(<ProductCard product={combo} />)

    expect(screen.getByText('Lunch plan + Phulka box')).toBeTruthy()
    expect(screen.getByText('₹600')).toBeTruthy()
    expect(screen.getByText('Save ₹80')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add Family combo to cart' })).toBeTruthy()
  })

  it('offers no Add to cart control on a paused product, but keeps its lead price', () => {
    render(<ProductCard product={{ ...product, available: false } as unknown as Product} />)

    expect(screen.queryByRole('link', { name: /Choose plan/ })).toBeNull()
    expect(screen.getByText('Paused')).toBeTruthy()
    expect(screen.getByText('From ₹59 a day')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Lunch plan' })).toBeTruthy()
  })

  it('shows no price and no buy control when the product has no durations', () => {
    render(<ProductCard product={{ ...product, durations: [] } as unknown as Product} />)

    expect(screen.queryByText(/a day/)).toBeNull()
    expect(screen.queryByRole('button', { name: /to cart/ })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Lunch plan' })).toBeTruthy()
  })
})
