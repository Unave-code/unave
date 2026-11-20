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
})
