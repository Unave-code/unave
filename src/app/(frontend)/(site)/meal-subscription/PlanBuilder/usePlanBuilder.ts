import { useState } from 'react'

import type { PlanBuilderData, PlanSlot } from '@/utilities/planBuilder'
import { SLOT_LABEL } from '@/utilities/planBuilder'

import { type Meal, MEALS, STEPS } from './ui'

/** Every choice the builder holds, and the prices and summary rows that follow from them. */
export function usePlanBuilder(data: PlanBuilderData) {
  const [step, setStep] = useState(0)
  // A lunch-only or dinner-only plan fixes its meal; the rest start with both.
  const offered: Meal[] = data.meals === 'any' ? MEALS : [data.meals]
  const [meals, setMeals] = useState<Record<Meal, boolean>>({
    dinner: data.meals !== 'lunch',
    lunch: data.meals !== 'dinner',
  })
  const [planLabel, setPlanLabel] = useState(data.plans[Math.min(1, data.plans.length - 1)]?.label ?? '')
  const [people, setPeople] = useState(1)
  const [choices, setChoices] = useState<number[]>(data.optionGroups.map(() => 0))

  const times: Record<Meal, string> = { dinner: data.dinnerTime, lunch: data.lunchTime }
  const slot: null | PlanSlot = meals.lunch && meals.dinner ? 'both' : meals.lunch ? 'lunch' : meals.dinner ? 'dinner' : null
  const plan = data.plans.find((p) => p.label === planLabel) ?? null
  const chosen = data.optionGroups.map((g, i) => g.choices[choices[i]] ?? g.choices[0])
  const planPrice = slot && plan ? (plan.prices[slot] ?? 0) : 0
  const valid = Boolean(slot && plan && planPrice > 0)
  const extraPerDay = chosen.reduce((sum, c) => sum + c.extraPerDay, 0)
  const extrasTotal = plan ? extraPerDay * plan.days * people : 0
  const total = planPrice * people + extrasTotal

  const go = (n: number) => setStep(Math.max(0, Math.min(STEPS.length - 1, n)))
  const toggleMeal = (m: Meal) => setMeals((c) => ({ ...c, [m]: !c[m] }))
  const choose = (group: number, choice: number) =>
    setChoices((prev) => prev.map((v, i) => (i === group ? choice : v)))

  const message = [
    `Hi UNAVE, I have a question about the ${data.title} meal plan:`,
    `• ${slot ? SLOT_LABEL[slot] : 'No meals picked'}, ${plan?.label ?? ''}, ${people} ${people > 1 ? 'people' : 'person'}`,
    ...chosen.map((c, i) => `• ${data.optionGroups[i].title}: ${c.label}`),
  ].join('\n')

  const planRows = [
    { label: 'Meals', to: 0, value: slot ? SLOT_LABEL[slot] : 'None picked' },
    { label: 'Plan', to: 0, value: plan ? `${plan.label} · ${plan.days} days` : '—' },
    { label: 'People', to: 0, value: String(people) },
    ...chosen.map((c, i) => ({ label: data.optionGroups[i].title, to: 2, value: c.label })),
  ]

  return {
    choices,
    choose,
    chosen,
    go,
    meals,
    message,
    offered,
    people,
    plan,
    planLabel,
    planPrice,
    planRows,
    setPeople,
    setPlanLabel,
    slot,
    step,
    times,
    toggleMeal,
    total,
    valid,
  }
}

export type PlanBuilderState = ReturnType<typeof usePlanBuilder>
