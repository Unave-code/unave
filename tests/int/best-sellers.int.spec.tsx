import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BestSellers } from '@/components/home/BestSellers'
import type { Product } from '@/payload-types'

const getFeaturedProducts = vi.hoisted(() => vi.fn())

vi.mock('@/utilities/products', () => ({
  getFeaturedHomeProducts: () => getFeaturedProducts,
}))

vi.mock('next/image', () => ({
  default: ({
    fill,
    priority,
    ...rest
  }: React.ComponentProps<'img'> & { fill?: boolean; priority?: boolean }) =>
    React.createElement('img', rest),
}))

afterEach(() => {
  cleanup()
  getFeaturedProducts.mockReset()
})

const renderBestSellers = async (products: Product[]) => {
  getFeaturedProducts.mockResolvedValue(products)
  render(await BestSellers({}))
}

describe('the homepage Best sellers shelf', () => {
  it('renders featured products in a labeled responsive grid', async () => {
    const product = {
      available: true,
      featured: true,
      id: 4,
      slug: 'brown-rice',
      title: 'Brown rice',
      type: 'one-time',
      price: 5000,
    } as unknown as Product

    await renderBestSellers([product])

    const grid = screen.getByRole('list', { name: 'Best sellers' })
    expect(grid.className).toContain('grid-cols-2')
    // Four or fewer fill one row of four; five or more use five columns.
    expect(grid.className).toContain('lg:grid-cols-4')
    expect(screen.getByRole('link', { name: 'Brown rice' }).getAttribute('href')).toBe(
      '/products/brown-rice',
    )
    expect(screen.getByRole('heading', { name: 'Brown rice' }).className).not.toContain('min-h-')
    expect(screen.getByText('₹50').className).toContain('text-green-700')
  })

  it('uses five columns once there are more than four products', async () => {
    const products = [1, 2, 3, 4, 5].map(
      (id) =>
        ({
          available: true,
          featured: true,
          id,
          price: 5000,
          slug: `product-${id}`,
          title: `Product ${id}`,
          type: 'one-time',
        }) as unknown as Product,
    )

    await renderBestSellers(products)

    expect(screen.getByRole('list', { name: 'Best sellers' }).className).toContain('lg:grid-cols-5')
  })

  it('shows a one-time product’s pack size, old price, discount, and cart form', async () => {
    const product = {
      available: true,
      compareAtPrice: 14900,
      featured: true,
      id: 1,
      packSize: '260 g',
      price: 10000,
      slug: 'chana-masala',
      title: 'Chana masala',
      type: 'one-time',
    } as unknown as Product

    await renderBestSellers([product])

    expect(screen.getByText('₹100')).toBeTruthy()
    expect(screen.getByText('₹149')).toBeTruthy()
    expect(screen.getByText('260 g')).toBeTruthy()
    expect(screen.getByText('32% OFF')).toBeTruthy()

    const button = screen.getByRole('button', { name: 'Add Chana masala to cart' })
    expect(button.textContent).toContain('Add to cart')
    const form = button.closest('form')

    expect(form?.getAttribute('action')).toBe('/api/cart/add')
    expect(form?.querySelector('input[name="product"]')?.getAttribute('value')).toBe('chana-masala')
    expect(form?.querySelector('input[name="duration"]')?.getAttribute('value')).toBe('one-time')
    expect(form?.querySelector('input[name="return"]')?.getAttribute('value')).toBe('/')

    const buyButton = screen.getByRole('button', { name: 'Buy Chana masala now' })
    const buyForm = buyButton.closest('form')
    expect(buyForm?.getAttribute('action')).toBe('/api/cart/add')
    expect(buyForm?.querySelector('input[name="product"]')?.getAttribute('value')).toBe(
      'chana-masala',
    )
    expect(buyForm?.querySelector('input[name="duration"]')?.getAttribute('value')).toBe('one-time')
    expect(buyForm?.querySelector('input[name="return"]')?.getAttribute('value')).toBe('/checkout')
    expect(buyForm?.querySelector('input[name="buyNow"]')?.getAttribute('value')).toBe('true')
  })

  it('keeps plan cards on their lead price and sends them to choose a duration', async () => {
    const product = {
      available: true,
      compareAtPrice: 7000,
      durations: [{ days: 7, id: 'week', label: 'One week', price: 35000 }],
      featured: true,
      fromPrice: 5000,
      id: 2,
      packSize: 'Should not display',
      slug: 'weekly-plan',
      title: 'Weekly plan',
      type: 'plan',
    } as unknown as Product

    await renderBestSellers([product])

    expect(screen.getByText('From ₹350')).toBeTruthy()
    expect(screen.queryByText('₹70')).toBeNull()
    expect(screen.queryByText('Should not display')).toBeNull()

    expect(
      screen.getByRole('link', { name: 'Choose plan for Weekly plan' }).getAttribute('href'),
    ).toBe('/products/weekly-plan')
  })

  it('shows a higher old price without a zero percent badge', async () => {
    const product = {
      available: true,
      compareAtPrice: 10099,
      featured: true,
      id: 3,
      price: 10000,
      slug: 'small-difference',
      title: 'Small difference',
      type: 'one-time',
    } as unknown as Product

    await renderBestSellers([product])

    expect(screen.getByText('₹100.99')).toBeTruthy()
    expect(screen.queryByText(/% off/)).toBeNull()
  })

  it('keeps the existing empty state when no featured products are returned', async () => {
    await renderBestSellers([])

    expect(screen.getByText('No products are featured right now.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'See every product' }).getAttribute('href')).toBe(
      '/products',
    )
  })
})
