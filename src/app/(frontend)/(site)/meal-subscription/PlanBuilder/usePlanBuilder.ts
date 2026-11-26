import { useState } from 'react'

import type { MealPick, PlanBuilderData } from '@/utilities/planBuilder'
import { encodeMealPick, mealPickLabel, mealPickPrice, offeredMeals, slotFor } from '@/utilities/planBuilder'

import { type Meal, STEPS } from './ui'

/** Every choice the builder holds, and the prices and summary rows that follow from them. */
export function usePlanBuilder(data: PlanBuilderData) {
  const [step, setStep] = useState(0)
  /* The meals this plan sells: a meal shows only when some length prices it,
     so a plan without breakfast prices never offers a breakfast it cannot sell. */
  const offered: Meal[] = offeredMeals(data)
  /* A one-meal plan fixes its meal. The rest start with lunch and dinner, the
     usual pick; breakfast is opt in. */
  const [meals, setMeals] = useState<Record<Meal, boolean>>(() => {
    const only = offered.length === 1 ? offered[0] : null
    const starts = (m: Meal) => (only ? only === m : m !== 'breakfast' && offered.includes(m))
    const initial = { breakfast: starts('breakfast'), dinner: starts('dinner'), lunch: starts('lunch') }
    // A plan with only breakfast and one other meal still starts with something picked.
    if (!Object.values(initial).some(Boolean) && offered[0]) initial[offered[0]] = true
    return initial
  })
  const [planLabel, setPlanLabel] = useState(data.plans[Math.min(1, data.plans.length - 1)]?.label ?? '')
  // Add-ons: any number per group, none picked to start.
  const [choices, setChoices] = useState<number[][]>(data.optionGroups.map(() => []))

  const times: Record<Meal, string> = { breakfast: data.breakfastTime, dinner: data.dinnerTime, lunch: data.lunchTime }
  const pick: MealPick = { breakfast: meals.breakfast, slot: slotFor(meals.lunch, meals.dinner) }
  const anyPicked = pick.breakfast || pick.slot !== null
  const plan = data.plans.find((p) => p.label === planLabel) ?? null
  const picked = data.optionGroups.map((g, i) => (choices[i] ?? []).map((ci) => g.choices[ci]).filter(Boolean))
  const chosen = picked.flat()
  const planPrice = plan ? (mealPickPrice(plan, pick) ?? 0) : 0
  const valid = Boolean(anyPicked && plan && planPrice > 0)
  const extraPerDay = chosen.reduce((sum, c) => sum + c.extraPerDay, 0)
  const extrasTotal = plan ? extraPerDay * plan.days : 0
  const total = planPrice + extrasTotal
  const mealsLabel = anyPicked ? mealPickLabel(pick) : 'None picked'

  const go = (n: number) => setStep(Math.max(0, Math.min(STEPS.length - 1, n)))
  const toggleMeal = (m: Meal) => setMeals((c) => ({ ...c, [m]: !c[m] }))
  const choose = (group: number, choice: number) =>
    setChoices((prev) =>
      prev.map((v, i) =>
        i !== group ? v : v.includes(choice) ? v.filter((c) => c !== choice) : [...v, choice].sort((a, b) => a - b),
      ),
    )

  const message = [
    `Hi UNAVE, I have a question about the ${data.title} meal plan:`,
    `• ${anyPicked ? mealsLabel : 'No meals picked'}, ${plan?.label ?? ''}`,
    ...picked.flatMap((list, i) => (list.length ? [`• ${data.optionGroups[i].title}: ${list.map((c) => c.label).join(', ')}`] : [])),
  ].join('\n')

  const planRows = [
    { label: 'Meals', to: 0, value: mealsLabel },
    { label: 'Plan', to: 0, value: plan ? `${plan.label} · ${plan.days} days` : '—' },
    ...picked.map((list, i) => ({
      label: data.optionGroups[i].title,
      to: 2,
      value: list.length ? list.map((c) => c.label).join(', ') : 'None',
    })),
  ]

  return {
    choices,
    choose,
    chosen,
    go,
    meals,
    /** The meals field the cart form posts, as encodeMealPick writes it; empty when nothing is picked. */
    mealsValue: anyPicked ? encodeMealPick(pick) : '',
    message,
    offered,
    pick,
    plan,
    planLabel,
    planPrice,
    planRows,
    setPlanLabel,
    step,
    times,
    toggleMeal,
    total,
    valid,
  }
}

export type PlanBuilderState = ReturnType<typeof usePlanBuilder>
