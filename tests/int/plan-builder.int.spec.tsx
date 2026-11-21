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
    { days: 6, label: 'Week', note: '', trial: false, prices: { both: 300000, dinner: 160000, lunch: 150000 } },
    { days: 24, label: 'Month', note: 'Best value', trial: false, prices: { both: 1100000, lunch: 600000 } },
  ],
  slug: 'kids',
  subcategory: null,
  thisWeek: { days: [{ day: 'Mon', dinner: { main: 'Dal', sides: ['Rice'] }, full: 'Monday', lunch: { main: 'Khichdi', sides: [] } }], range: '1–6 Dec' },
  title: 'Kids plan',
}

const renderBuilder = (overrides: Partial<PlanBuilderData> = {}) =>
  render(<PlanBuilder data={{ ...data, ...overrides }} notice={null} whatsapp="919999999999" />)

// Role queries walk the whole builder; under the full suite's load one test can pass 5s.
describe('the meal plan builder', { timeout: 20_000 }, () => {
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

  it('fixes the meal on a lunch-only plan', () => {
    renderBuilder({ meals: 'lunch' })
    const lunch = screen.getByRole('checkbox', { name: /Lunch/ })
    expect(lunch.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(lunch)
    expect(lunch.getAttribute('aria-checked')).toBe('true')
    expect(screen.queryByRole('checkbox', { name: /Dinner/ })).toBeNull()
  })

  it('prices only lengths offered for the chosen meals', () => {
    renderBuilder()
    fireEvent.click(screen.getByRole('checkbox', { name: /Lunch/ }))
    const month = screen.getByRole('radio', { name: /Month/ })
    expect(month.textContent).toContain('Not offered for these meals')
    fireEvent.click(month)
    for (const add of screen.getAllByRole('button', { name: /Add plan to cart/ })) {
      expect((add as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('enables Add plan to cart only on the last step', () => {
    renderBuilder()
    fireEvent.click(screen.getByRole('radio', { name: /Week/ }))
    const adds = () => screen.getAllByRole('button', { name: /Add plan to cart/ }) as HTMLButtonElement[]
    expect(adds().every((b) => b.disabled)).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /Next: Menu/ }))
    expect(adds().every((b) => b.disabled)).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /Next: Options/ }))
    expect(adds().every((b) => !b.disabled)).toBe(true)
  })

  it('shows only the trial days of the menu for a trial length', () => {
    const base = data.plans[0]
    const dish = { main: 'Dal', sides: [] }
    const day = (d: string, full: string, has: boolean) => ({ day: d, dinner: has ? dish : null, full, lunch: has ? dish : null })
    renderBuilder({
      plans: [{ ...base, days: 3, label: 'Trial', note: '', trial: true }, ...data.plans],
      thisWeek: {
        days: [day('Mon', 'Monday', true), day('Tue', 'Tuesday', false), day('Wed', 'Wednesday', true), day('Thu', 'Thursday', true), day('Fri', 'Friday', true)],
        range: '',
      },
    })
    fireEvent.click(screen.getByRole('radio', { name: /Trial/ }))
    fireEvent.click(screen.getByRole('button', { name: /Next: Menu/ }))
    const rows = screen.getAllByRole('row').slice(1)
    // Three days with a dish; the empty Tuesday and the days after the trial are hidden.
    // Numbered, not named, since a trial can start on any day.
    expect(rows.map((r) => r.querySelector('th')?.textContent)).toEqual(['1', '2', '3'])
    expect(screen.getByText(/Your 3 trial days/)).toBeTruthy()
  })

  it('totals options per day per person', () => {
    renderBuilder()
    fireEvent.click(screen.getByRole('radio', { name: /Week/ }))
    fireEvent.click(screen.getByRole('button', { name: 'One more person' }))
    fireEvent.click(screen.getByRole('button', { name: /Next: Menu/ }))
    fireEvent.click(screen.getByRole('button', { name: /Next: Options/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Roti/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /^B/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /^C/ }))
    expect(screen.getAllByText(formatPaise(300000 * 2 + (2000 + 500 + 900) * 6 * 2)).length).toBeGreaterThan(0)
    // A second click takes an add-on off again.
    fireEvent.click(screen.getByRole('checkbox', { name: /^B/ }))
    expect(screen.getAllByText(formatPaise(300000 * 2 + (2000 + 900) * 6 * 2)).length).toBeGreaterThan(0)
  })

  it('says when there are no options', () => {
    renderBuilder({ optionGroups: [] })
    fireEvent.click(screen.getByRole('button', { name: /Next: Menu/ }))
    fireEvent.click(screen.getByRole('button', { name: /Next: Options/ }))
    expect(screen.getByText('No add-ons for this plan. Your plan is ready.')).toBeTruthy()
  })

  it('shows a chosen tile in solid brand green, as the product page does', () => {
    renderBuilder()
    const week = screen.getByRole('radio', { name: /Week/ })
    fireEvent.click(week)
    expect(week.className).toContain('bg-green-700')
    expect(screen.getByRole('radio', { name: /Month/ }).className).not.toContain('bg-green-700')
  })

  it('posts the same cart form', () => {
    const { container } = renderBuilder()
    fireEvent.click(screen.getByRole('radio', { name: /Week/ }))
    fireEvent.click(screen.getByRole('button', { name: 'One more person' }))
    fireEvent.click(screen.getByRole('button', { name: /Next: Menu/ }))
    fireEvent.click(screen.getByRole('button', { name: /Next: Options/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Rice/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Roti/ }))
    const form = container.querySelector('form[action="/api/cart/plan"]') as HTMLFormElement
    const value = (name: string) => (form.querySelector(`input[name="${name}"]`) as HTMLInputElement).value
    expect(value('slot')).toBe('both')
    expect(value('plan')).toBe('Week')
    expect(value('people')).toBe('2')
    expect(value('mealPlan')).toBe('kids')
    const values = (name: string) => [...form.querySelectorAll(`input[name="${name}"]`)].map((i) => (i as HTMLInputElement).value)
    expect(values('choice-0')).toEqual(['0', '1'])
    expect(values('choice-1')).toEqual([])
  })

  it('edits a summary row back to its step', () => {
    renderBuilder()
    fireEvent.click(screen.getByRole('button', { name: /Next: Menu/ }))
    fireEvent.click(screen.getByRole('button', { name: /Next: Options/ }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit meals' })[0])
    expect(screen.getByRole('heading', { level: 2, name: 'Choose your plan' })).toBeTruthy()
  })

  it('keeps the WhatsApp ask with the plan in the message', () => {
    renderBuilder()
    const href = screen.getAllByRole('link', { name: /Ask us on WhatsApp first/ })[0].getAttribute('href') ?? ''
    expect(href).toContain('wa.me/919999999999')
    expect(href).toContain(encodeURIComponent('Kids plan'))
  })

  it('wears the cart summary card, with no gold text on a light surface', () => {
    const { container } = renderBuilder()
    const summary = screen.getByRole('complementary', { name: 'Your plan' })
    expect(summary.className).toContain('bg-card')
    expect(summary.querySelector('img')).toBeNull()
    expect(container.querySelector('.text-gold-400')).toBeNull()
  })
})
