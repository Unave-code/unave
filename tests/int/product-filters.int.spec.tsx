import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { ProductFilters, type ProductFilterCard } from '@/components/Store/ProductFilters'

/**
 * The audience filter on a category page (spec 0008, AC-2, AC-3 and AC-11).
 *
 * These run against the real component in jsdom. They pin the contract the
 * spec cares about: All is the default, a pill click filters the visible cards
 * with no server round trip, the pressed state follows the choice, the live
 * region tells a screen reader how many products match, each pill carries its
 * icon, and the two empty states say different, honest things.
 */

afterEach(cleanup)

const card = (id: number, audience: string, label: string): ProductFilterCard => ({
  audience: audience as ProductFilterCard['audience'],
  id,
  node: <p>{label}</p>,
})

const cards = [card(1, 'kids', 'the kids card'), card(2, 'adults', 'the adults card')]

const renderFilter = (
  overrides: Partial<{ cards: ProductFilterCard[]; whatsapp: null | string }> = {},
) =>
  render(
    <ProductFilters
      cards={overrides.cards ?? cards}
      whatsapp={overrides.whatsapp !== undefined ? overrides.whatsapp : '+919000000000'}
    />,
  )

describe('the audience pills', () => {
  it('offer All, Kids, Adults and Special, with All pressed first', () => {
    renderFilter()

    for (const name of ['All', 'Kids', 'Adults', 'Special']) {
      expect(screen.getByRole('group', { name: 'Filter the products by audience' }).textContent).toContain(name)
    }

    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Kids' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('sit in a labelled group a screen reader can find', () => {
    renderFilter()

    expect(screen.getByRole('group', { name: 'Filter the products by audience' })).toBeTruthy()
  })

  it('show every card under All, the default', () => {
    renderFilter()

    expect(screen.getByText('the kids card')).toBeTruthy()
    expect(screen.getByText('the adults card')).toBeTruthy()
    expect(screen.getByText('2 products shown.')).toBeTruthy()
  })

  it('keep only the cards of the chosen audience, without a page load', () => {
    renderFilter()

    fireEvent.click(screen.getByRole('button', { name: 'Kids' }))

    expect(screen.getByText('the kids card')).toBeTruthy()
    expect(screen.queryByText('the adults card')).toBeNull()
    expect(screen.getByRole('button', { name: 'Kids' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('announce the new count politely', () => {
    renderFilter()

    fireEvent.click(screen.getByRole('button', { name: 'Kids' }))
    expect(screen.getByText('1 product shown.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('2 products shown.')).toBeTruthy()
  })

  it('return every card when All is chosen again', () => {
    renderFilter()

    fireEvent.click(screen.getByRole('button', { name: 'Adults' }))
    expect(screen.queryByText('the kids card')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('the kids card')).toBeTruthy()
  })

  it('carry an icon beside the label, keeping the label as the name (AC-11)', () => {
    renderFilter()

    const group = screen.getByRole('group', { name: 'Filter the products by audience' })
    expect(group.querySelectorAll('button')).toHaveLength(4)

    for (const name of ['All', 'Kids', 'Adults', 'Special']) {
      const pill = screen.getByRole('button', { name })
      expect(pill.getAttribute('aria-pressed')).not.toBeNull()
      expect(pill.querySelector('svg')).toBeTruthy()
      expect(pill.textContent).toBe(name)
    }
  })
})

describe('the filter empty state', () => {
  it('says the shelf is only filtered, and offers WhatsApp', () => {
    renderFilter()

    fireEvent.click(screen.getByRole('button', { name: 'Special' }))

    expect(screen.getByText('Nothing under this filter')).toBeTruthy()
    expect(screen.getByText(/No product for that audience on this shelf right now/)).toBeTruthy()
    expect(document.querySelector('a[href*="wa.me"]')).toBeTruthy()
  })

  it('drops the WhatsApp button when the footer has no number', () => {
    renderFilter({ whatsapp: null })

    fireEvent.click(screen.getByRole('button', { name: 'Special' }))

    expect(screen.getByText('Nothing under this filter')).toBeTruthy()
    expect(document.querySelector('a[href*="wa.me"]')).toBeNull()
  })
})

describe('the empty category', () => {
  it('shows the products page empty card instead of a shelf', () => {
    renderFilter({ cards: [] })

    expect(screen.getByText('No products are open right now')).toBeTruthy()
    expect(document.querySelector('a[href*="wa.me"]')).toBeTruthy()
  })
})
