import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProductDetail } from '@/components/Store/ProductDetail'
import type { Product } from '@/payload-types'

// RichText drags Payload's admin styles (.scss) into the test; the page's own
// behavior is what these tests hold, so the renderer is stubbed.
vi.mock('@/components/RichText', () => ({
  default: () => React.createElement('div', { 'data-testid': 'rich-text' }),
}))

// Next's image optimizer needs the Next runtime; the page only cares that it
// renders an image element with the right source, so it is a plain img here.
vi.mock('next/image', () => ({
  default: ({
    fill,
    priority,
    ...rest
  }: React.ComponentProps<'img'> & { fill?: boolean; priority?: boolean }) =>
    React.createElement('img', rest),
}))

// The related shelf renders real cards; what the page holds is that the cards
// it is given appear under the points, so the card is a stub here.
vi.mock('@/components/Store/ProductCard', () => ({
  ProductCard: ({ product }: { product: Product }) =>
    React.createElement('div', { 'data-testid': 'related-card' }, product.title),
}))

/**
 * A product's own page (design.md §6.15), the room the card opens.
 *
 * Two columns on desktop: the photo on the left with the name riding its
 * gradient band, the points flowing under it, and the buy column pinned
 * sticky on the right — the bare hairline-divided panel first, the
 * description under it. Related products from the same shelf sit below the
 * points. The page carries what the card gave up: the subcategory eyebrow, the category and
 * audience badges, the description and the points. A paused product renders in
 * full with nothing to add.
 */

afterEach(cleanup)

const openProduct = {
  available: true,
  audience: { id: 1, slug: 'kids', title: 'Kids' },
  category: 'ready-to-cook',
  description: { root: { children: [] } },
  durations: [{ days: 7, id: 'd1', label: 'One week', price: 49900 }],
  id: 1,
  points: [{ point: 'Prepped and ready' }],
  slug: 'lunch-plan',
  subcategory: { id: 5, title: 'Weekly plans', category: 'ready-to-cook' },
  title: 'Lunch plan',
} as unknown as Product

const comboProduct = {
  available: true,
  audience: { id: 2, slug: 'adults', title: 'Adults' },
  category: 'ready-to-eat',
  components: [
    {
      durationDaysSnapshot: 5,
      durationLabel: 'One week',
      product: {
        available: true,
        durations: [{ days: 5, id: 'd1', label: 'One week', price: 150000 }],
        id: 12,
        title: 'Lunch plan',
        type: 'plan',
      },
    },
    {
      product: { available: true, id: 34, price: 4900, title: 'Phulka box', type: 'one-time' },
    },
  ],
  description: { root: { children: [] } },
  id: 99,
  price: 99000,
  slug: 'family-combo',
  subcategory: { category: 'ready-to-eat', id: 6, title: 'Combos' },
  title: 'Family combo',
  type: 'combo',
} as unknown as Product

describe('a product page', () => {
  it('leads with the name, the eyebrow, the badges, the price panel and its points', () => {
    render(<ProductDetail product={openProduct} whatsapp="+919000000000" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Lunch plan' })).toBeTruthy()
    // The subcategory reads under the name and again in the details table.
    expect(screen.getAllByText(/Weekly plans/).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Browse Ready to cook products' })).toBeTruthy()
    // The audience is a chip and a row in the details table.
    expect(screen.getAllByText('Kids').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeTruthy()
    expect(screen.getByTestId('rich-text')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'What you get' })).toBeTruthy()
    expect(screen.getByText('Prepped and ready')).toBeTruthy()
  })

  it('links back to the shelf and on to the product category', () => {
    render(<ProductDetail product={openProduct} />)

    expect(screen.getByRole('link', { name: 'All products' }).getAttribute('href')).toBe(
      '/products',
    )
    expect(
      screen.getByRole('link', { name: 'Browse Ready to cook products' }).getAttribute('href'),
    ).toBe('/products/ready-to-cook')
  })

  it('shows a paused product in full, with nothing to add', () => {
    render(<ProductDetail product={{ ...openProduct, available: false } as unknown as Product} />)

    expect(screen.getByText('Paused')).toBeTruthy()
    expect(screen.getByText(/This product is paused right now/)).toBeTruthy()
    expect(screen.getByText('₹499')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add to cart' })).toBeNull()
  })

  it('reads the description below the price and the related shelf below the points', () => {
    const related = [
      openProduct,
      { ...openProduct, id: 2, title: 'Weekly thali' },
    ] as unknown as Product[]

    render(<ProductDetail product={openProduct} related={related} />)

    // The description trails the buy panel: the price control precedes it.
    const description = screen.getByTestId('rich-text')
    const add = screen.getByRole('button', { name: 'Add to cart' })
    expect(add.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    // Related products show once, as a full-width row below the page.
    expect(screen.getByRole('heading', { name: 'People also bought' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'More from the kitchen' })).toBeNull()
    expect(screen.getAllByTestId('related-card')).toHaveLength(2)
  })

  it('shows the benefits, and no FAQ', () => {
    render(
      <ProductDetail
        product={
          {
            ...openProduct,
            benefits: [
              { description: 'Easy on the stomach.', icon: 'leaf', id: 'b1', title: 'Gut health' },
            ],
          } as Product
        }
      />,
    )

    expect(screen.getByRole('heading', { name: /^Benefits of / })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Gut health' })).toBeTruthy()
    expect(screen.getByText('Easy on the stomach.')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'FAQ' })).toBeNull()
  })

  it('offers Buy now in the same form as Add to cart', () => {
    render(<ProductDetail product={openProduct} />)

    const buyNow = screen.getByRole('button', { name: 'Buy now' })
    expect(buyNow.getAttribute('name')).toBe('buyNow')
    expect(buyNow.closest('form')).toBe(
      screen.getByRole('button', { name: 'Add to cart' }).closest('form'),
    )
  })

  it('explains how a plan works, preferring the plan’s own text, and the start-date call', () => {
    const { unmount } = render(
      <ProductDetail planHowItWorks={'Pay once\nWe call you'} product={openProduct} />,
    )
    expect(screen.getByRole('heading', { name: 'How your plan works' })).toBeTruthy()
    expect(screen.getByText('We call you')).toBeTruthy()
    expect(screen.getByText(/our team calls you to confirm when your plan begins/)).toBeTruthy()
    unmount()

    render(
      <ProductDetail
        planHowItWorks={'Pay once\nWe call you'}
        product={{ ...openProduct, howItWorks: 'Our own first step' } as Product}
      />,
    )
    expect(screen.getByText('Our own first step')).toBeTruthy()
    expect(screen.queryByText('We call you')).toBeNull()
  })

  it('offers each size of a sized one-time product as a tile', () => {
    const sized = {
      ...openProduct,
      durations: [],
      price: 9900,
      sizes: [
        { compareAtPrice: 12000, id: 's1', label: '250 g', price: 9900 },
        { id: 's2', label: '500 g', price: 18000 },
      ],
      type: 'one-time',
    } as unknown as Product
    render(<ProductDetail product={sized} />)

    const small = screen.getByRole('radio', { name: /250 g/ })
    expect(small.getAttribute('name')).toBe('duration')
    expect(small.getAttribute('value')).toBe('250 g')
    expect(screen.getByRole('radio', { name: /500 g/ })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'How your plan works' })).toBeNull()
  })

  it('offers no related shelf when none is passed', () => {
    render(<ProductDetail product={openProduct} />)

    expect(screen.queryByRole('heading', { name: 'More from the kitchen' })).toBeNull()
    expect(screen.queryAllByTestId('related-card')).toHaveLength(0)
  })

  it('lists what a combo includes and keeps the required notice beside it', () => {
    render(<ProductDetail product={comboProduct} />)

    expect(screen.getByRole('heading', { name: /^Included in this combo/ })).toBeTruthy()
    expect(screen.getByText('Lunch plan')).toBeTruthy()
    expect(screen.getByText(/One week, 5 days/)).toBeTruthy()
    expect(screen.getByText('Phulka box')).toBeTruthy()
    expect(screen.getByText('A note on our meals')).toBeTruthy()
    expect(
      screen.getByText(
        'Our meals are food options and are not a substitute for medical or nutritional advice.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeTruthy()
  })

  it('shows a paused combo in full, with nothing to add', () => {
    render(<ProductDetail product={{ ...comboProduct, available: false } as unknown as Product} />)

    expect(screen.getByText('Paused')).toBeTruthy()
    // The price leads the middle column and the buy box.
    expect(screen.getAllByText('₹990').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: /^Included in this combo/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add to cart' })).toBeNull()
  })

  it('marks a combo paused when one of its products is paused', () => {
    render(
      <ProductDetail
        product={
          {
            ...comboProduct,
            components: [
              ...((comboProduct.components ?? []) as unknown[]),
              { product: { available: false, id: 40, title: 'Paused item', type: 'one-time' } },
            ],
          } as unknown as Product
        }
      />,
    )

    expect(screen.getByText('Paused')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add to cart' })).toBeNull()
  })
})
