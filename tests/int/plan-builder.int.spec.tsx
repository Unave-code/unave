import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PlanBuilder } from '@/app/(frontend)/(site)/meal-subscription/PlanBuilder'
import { formatPaise } from '@/utilities/money'
import type { PlanBuilderData } from '@/utilities/planBuilder'

vi.mock('next/image', () => ({
  default: ({ fill, priority, ...rest }: React.ComponentProps<'img'> & { fill?: boolean; priority?: boolean }) =>
    React.createElement('img', rest),
}))
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...rest }, children),
}))

/**
 * The meal plan builder (docs/superpowers/specs/2026-11-21-meal-plan-wizard-redesign-design.md):
 * a shop page header, then three steps and a live summary, posting the plan to
 * the cart. These tests hold what the builder does, so its look can change freely.
 */

afterEach(cleanup)

const data: PlanBuilderData = {
  audience: { slug: 'kids', title: 'Kids' },
  description: 'Tasty',
  dinnerTime: '7pm',
  image: { alt: '', url: '/a.jpg' },
  lunchTime: '12pm',
  meals: 'any',
  optionGroups: [
    { choices: [{ detail: '', extraPerDay: 0, label: 'Rice' }, { detail: 'Soft', extraPerDay: 2000, label: 'Roti' }], hint: '', title: 'Carb' },
    {
      choices: [
        { detail: '', extraPerDay: 0, label: 'A' },
        { detail: '', extraPerDay: 500, label: 'B' },
        { detail: '', extraPerDay: 900, label: 'C' },
      ],
      hint: '',
      title: 'Extra',
    },
  ],
  plans: [
    { days: 6, label: 'Week', note: '', prices: { both: 300000, dinner: 160000, lunch: 150000 } },
    { days: 24, label: 'Month', note: 'Best value', prices: { both: 1100000, lunch: 600000 } },
  ],
  slug: 'kids',
  thisWeek: { days: [{ day: 'Mon', dinner: { main: 'Dal', sides: ['Rice'] }, full: 'Monday', lunch: { main: 'Khichdi', sides: [] } }], range: '1–6 Dec' },
  title: 'Kids plan',
}

const renderBuilder = (overrides: Partial<PlanBuilderData> = {}) =>
  render(<PlanBuilder data={{ ...data, ...overrides }} notice={null} whatsapp="919999999999" />)

describe('the meal plan builder', () => {
  it('opens on the builder with no hero block', () => {
    renderBuilder()
    expect(screen.getByRole('heading', { level: 1, name: 'Build your Kids plan' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Build your plan/ })).toBeNull()
    expect(screen.queryByText('From, for one person')).toBeNull()
    expect(screen.getByRole('link', { name: 'Meal plans' }).getAttribute('href')).toBe('/meal-subscription')
    expect(screen.getByText('Tasty')).toBeTruthy()
  })

  it('shows plans open soon when there are no prices', () => {
    renderBuilder({ plans: [] })
    expect(screen.getByRole('heading', { name: 'Plans open soon' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Build your Kids plan' })).toBeNull()
  })

  it('marks the current step and locks later steps until a meal is picked', () => {
    renderBuilder()
    const steps = within(screen.getByRole('navigation', { name: 'Steps' }))
    expect(steps.getByRole('button', { name: /Plan/ }).getAttribute('aria-current')).toBe('step')
    fireEvent.click(screen.getByRole('checkbox', { name: /Lunch/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Dinner/ }))
    expect((steps.getByRole('button', { name: /Menu/ }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: /Next: Menu/ }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Pick at least one meal.')).toBeTruthy()
    for (const add of screen.getAllByRole('button', { name: /Add plan to cart/ })) {
      expect((add as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('moves focus to the step heading and lets a finished step be reopened', () => {
    renderBuilder()
    fireEvent.click(screen.getByRole('button', { name: /Next: Menu/ }))
    expect(document.activeElement?.textContent).toBe('See the menu')
    const steps = within(screen.getByRole('navigation', { name: 'Steps' }))
    fireEvent.click(steps.getByRole('button', { name: /Plan/ }))
    expect(screen.getByRole('heading', { level: 2, name: 'Choose your plan' })).toBeTruthy()
  })

  it('wears the checkout step strip and pill buttons', () => {
    renderBuilder()
    const steps = within(screen.getByRole('navigation', { name: 'Steps' }))
    // The current step's dot is gold, as in the cart and checkout strip.
    expect(steps.getByRole('button', { name: /Plan/ }).querySelector('.bg-gold-400')).toBeTruthy()
    // Next is the shared primary pill.
    expect(screen.getByRole('button', { name: /Next: Menu/ }).className).toContain('h-13')
  })
})
