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
  it('centers the section heading without the product shelf action', async () => {
    getSubcategories.mockResolvedValue([])

    render(await ProductShelf({}))

    const heading = screen.getByRole('heading', { name: 'Browse our current selection' })
    expect(heading.className).toContain('text-center')
    expect(screen.queryByRole('link', { name: 'See every product' })).toBeNull()
  })

  it('omits the intro and available-meal count', async () => {
    getSubcategories.mockResolvedValue([
      { category: 'fresh-from-produce', id: 45, slug: 'greens', title: 'Greens' },
    ])

    render(await ProductShelf({}))

    expect(screen.queryByText('Explore the available meal types, or see every product.')).toBeNull()
    expect(screen.queryByText('1 meal type currently available.')).toBeNull()
  })

  it('renders five compact mobile columns that wrap without horizontal scrolling', async () => {
    getSubcategories.mockResolvedValue([
      { category: 'fresh-from-produce', id: 45, slug: 'greens', title: 'Greens' },
    ])

    render(await ProductShelf({}))

    const list = screen.getByRole('list', { name: 'Meal subcategories' })
    expect(list.className).toContain('grid-cols-5')
    expect(list.className).toContain('sm:flex-wrap')
    expect(list.className).not.toContain('overflow-x-auto')
    expect(list.getAttribute('tabindex')).toBeNull()

    const link = screen.getByRole('link', { name: 'Browse Greens products' })
    expect(link.className).toContain('min-h-16')
    expect(link.className).toContain('sm:size-40')
    expect(link.className).toContain('rounded-2xl')
    expect(link.className).toContain('border-gold-300')
    expect(link.querySelector('svg')?.getAttribute('class')).toContain('size-6')
    expect(link.querySelector('h3')?.className).toContain('wrap-anywhere')
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
