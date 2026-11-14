import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Gallery } from '@/components/home/Gallery'
import { safeLinkHref } from '@/utilities/safeLinkHref'

const getHero = vi.hoisted(() => vi.fn())
const getCachedGlobal = vi.hoisted(() => vi.fn())

vi.mock('@/utilities/getGlobals', () => ({ getCachedGlobal }))

vi.mock('next/image', () => ({
  default: ({
    fill,
    quality,
    sizes,
    ...props
  }: React.ComponentProps<'img'> & { fill?: boolean; quality?: number; sizes?: string }) =>
    React.createElement('img', props),
}))

afterEach(() => {
  cleanup()
  getCachedGlobal.mockReset()
  getHero.mockReset()
})

describe('homepage photo gallery', () => {
  it('uses the configured photo and links it to the saved destination', async () => {
    getCachedGlobal.mockReturnValue(getHero)
    getHero.mockResolvedValue({
      gallery: {
        image1: {
          image: { alt: 'A bowl of greens', url: '/media/greens.jpg' },
          link: '/products',
        },
      },
    })

    render(await Gallery({}))

    expect(getCachedGlobal).toHaveBeenCalledWith('hero', 1)
    const link = screen.getByRole('link', { name: 'A bowl of greens' })
    expect(link.getAttribute('href')).toBe('/products')
    expect(link.querySelector('img')?.getAttribute('src')).toBe('/media/greens.jpg')
    expect(screen.getAllByRole('img')).toHaveLength(3)
  })

  it('keeps the existing photos when no gallery images are configured', async () => {
    getCachedGlobal.mockReturnValue(getHero)
    getHero.mockResolvedValue(null)

    render(await Gallery({}))

    expect(screen.getAllByRole('img').map((image) => image.getAttribute('alt'))).toEqual([
      'A plated meal with vegetables and sauce',
      'A salad with sliced avocado, greens and pomegranate',
      'Fresh vegetables arranged on a kitchen prep board',
    ])
    expect(screen.queryByRole('link')).toBeNull()
  })
})

describe('safeLinkHref', () => {
  it('allows site paths and HTTP(S) destinations while rejecting unsafe schemes', () => {
    expect(safeLinkHref('/products?category=meals')).toBe('/products?category=meals')
    expect(safeLinkHref('https://example.com/menu')).toBe('https://example.com/menu')
    expect(safeLinkHref('//example.com/menu')).toBeNull()
    expect(safeLinkHref('javascript:alert(1)')).toBeNull()
    expect(safeLinkHref('https://example.com\\@evil.com')).toBeNull()
  })
})
