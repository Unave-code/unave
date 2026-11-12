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
