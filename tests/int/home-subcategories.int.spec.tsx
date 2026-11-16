import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProductShelf } from '@/components/home/Products'

const getHeader = vi.hoisted(() => vi.fn())

vi.mock('@/utilities/getGlobals', () => ({
  getCachedGlobal: () => getHeader,
}))

vi.mock('next/image', () => ({
  default: ({
    fill,
    priority,
    ...rest
  }: React.ComponentProps<'img'> & { fill?: boolean; priority?: boolean }) =>
    React.createElement('img', rest),
}))

const navLink = (label: string, url: string) => ({ link: { label, type: 'custom', url } })

afterEach(() => {
  cleanup()
  getHeader.mockReset()
})

describe('homepage category tiles', () => {
  it('centers the section heading without the product shelf action', async () => {
    getHeader.mockResolvedValue({ navItems: [] })

    render(await ProductShelf({}))

    const heading = screen.getByRole('heading', { name: 'Browse our current selection' })
    expect(heading.className).toContain('text-center')
    expect(screen.queryByRole('link', { name: 'See every product' })).toBeNull()
  })

  it('shows only the main categories the menu links to, in menu order', async () => {
    getHeader.mockResolvedValue({
      navItems: [
        navLink('About', '/about'),
        navLink('Ready to eat', '/products/ready-to-eat'),
        navLink('Fresh', '/products/fresh-from-produce'),
        navLink('Some product', '/products/garlic-podi'),
      ],
    })

    render(await ProductShelf({}))

    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/products/ready-to-eat',
      '/products/fresh-from-produce',
    ])
    expect(screen.getByRole('link', { name: 'Browse Fresh products' })).toBeTruthy()
  })

  it('falls back to all three categories when the menu links none', async () => {
    getHeader.mockResolvedValue({ navItems: [navLink('About', '/about')] })

    render(await ProductShelf({}))

    expect(screen.getAllByRole('link')).toHaveLength(3)
  })

  it('renders three readable mobile columns that wrap without horizontal scrolling', async () => {
    getHeader.mockResolvedValue({
      navItems: [navLink('Fresh from produce', '/products/fresh-from-produce')],
    })

    render(await ProductShelf({}))

    const list = screen.getByRole('list', { name: 'Product categories' })
    expect(list.className).toContain('grid-cols-3')
    expect(list.className).toContain('sm:flex-wrap')
    expect(list.className).not.toContain('overflow-x-auto')

    const link = screen.getByRole('link', { name: 'Browse Fresh from produce products' })
    expect(link.className).toContain('min-h-32')
    expect(link.className).toContain('sm:w-40')
    expect(link.className).toContain('rounded-2xl')
    expect(link.className).toContain('border-gold-300')
    expect(link.querySelector('svg')?.getAttribute('class')).toContain('size-6')
    expect(link.querySelector('h3')?.className).toContain('wrap-anywhere')
  })
})
