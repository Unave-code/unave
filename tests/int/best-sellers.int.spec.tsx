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
    const form = button.closest('form')

    expect(form?.getAttribute('action')).toBe('/api/cart/add')
    expect(form?.querySelector('input[name="product"]')?.getAttribute('value')).toBe('chana-masala')
    expect(form?.querySelector('input[name="duration"]')?.getAttribute('value')).toBe('one-time')
    expect(form?.querySelector('input[name="return"]')?.getAttribute('value')).toBe('/')
  })

  it('keeps plan cards on their lead price and first duration', async () => {
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

    expect(screen.getByText('From ₹50 a day')).toBeTruthy()
    expect(screen.queryByText('₹70')).toBeNull()
    expect(screen.queryByText('Should not display')).toBeNull()

    const form = screen.getByRole('button', { name: 'Add Weekly plan to cart' }).closest('form')
    expect(form?.querySelector('input[name="duration"]')?.getAttribute('value')).toBe('One week')
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
