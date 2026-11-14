import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProductShelf } from '@/components/home/Products'

const getSubcategories = vi.hoisted(() => vi.fn())

vi.mock('@/utilities/products', () => ({
  getHomeSubcategories: () => getSubcategories,
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
  getSubcategories.mockReset()
})

describe('homepage subcategory tiles', () => {
  it('omits the intro and available-meal count', async () => {
    getSubcategories.mockResolvedValue([
      { category: 'fresh-from-produce', id: 45, slug: 'greens', title: 'Greens' },
    ])

    render(await ProductShelf({}))

    expect(screen.queryByText('Explore the available meal types, or see every product.')).toBeNull()
    expect(screen.queryByText('1 meal type currently available.')).toBeNull()
  })

  it('renders a square icon card in a keyboard-scrollable row', async () => {
    getSubcategories.mockResolvedValue([
      { category: 'fresh-from-produce', id: 45, slug: 'greens', title: 'Greens' },
    ])

    render(await ProductShelf({}))

    const list = screen.getByRole('list', { name: 'Meal subcategories' })
    expect(list.getAttribute('tabindex')).toBe('0')
    expect(list.className).toContain('overflow-x-auto')

    const link = screen.getByRole('link', { name: 'Browse Greens products' })
    expect(link.className).toContain('size-40')
    expect(link.className).toContain('border-gold-300')
    expect(link.querySelector('svg')?.getAttribute('class')).toContain('size-12')
    expect(link.querySelector('img')).toBeNull()
  })

  it('opens the category shelf filtered by the subcategory slug', async () => {
    getSubcategories.mockResolvedValue([
      { category: 'fresh-from-produce', id: 45, slug: 'greens', title: 'Greens' },
    ])

    render(await ProductShelf({}))

    expect(screen.getByRole('link', { name: 'Browse Greens products' }).getAttribute('href')).toBe(
      '/products/fresh-from-produce?subcategory=greens',
    )
  })
})
