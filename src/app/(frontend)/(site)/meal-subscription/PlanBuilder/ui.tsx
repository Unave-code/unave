import { Check, Moon, Sun } from 'lucide-react'
import React from 'react'

import { cn } from '@/utilities/ui'

export type Meal = 'lunch' | 'dinner'
export const MEALS: Meal[] = ['lunch', 'dinner']
export const MEAL_ICON = { dinner: Moon, lunch: Sun }
export const MEAL_LABEL = { dinner: 'Dinner', lunch: 'Lunch' }

export const STEPS = [
  { heading: 'Choose your plan', label: 'Plan' },
  { heading: 'See the menu', label: 'Menu' },
  { heading: 'Choose your options', label: 'Options' },
] as const

export const focusRing =
  'focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:outline-none'

/** A large selectable card used for every choice in the builder. */
export const ChoiceCard: React.FC<{
  children: React.ReactNode
  onClick: () => void
  role?: 'checkbox' | 'radio'
  selected: boolean
}> = ({ children, onClick, role = 'radio', selected }) => (
  <button
    aria-checked={selected}
    className={cn(
      'relative flex min-h-14 w-full flex-col items-start gap-1 rounded-2xl border-2 bg-white p-4 text-left transition-colors motion-reduce:transition-none',
      selected ? 'border-green-700 bg-green-50' : 'border-line hover:border-green-500',
      focusRing,
    )}
    onClick={onClick}
    role={role}
    type="button"
  >
    <span
      aria-hidden
      className={cn(
        'absolute top-4 right-4 grid size-6 place-items-center border-2',
        role === 'radio' ? 'rounded-full' : 'rounded-md',
        selected ? 'border-green-700 bg-green-700 text-white' : 'border-line bg-white',
      )}
    >
      {selected && <Check className="size-3.5" strokeWidth={3} />}
    </span>
    {children}
  </button>
)

export const FieldLabel: React.FC<{ children: React.ReactNode; hint?: string; id: string }> = ({ children, hint, id }) => (
  <div className="mb-3">
    <h3 className="text-ink-900 font-extrabold" id={id}>
      {children}
    </h3>
    {hint && <p className="text-ink-600 text-sm">{hint}</p>}
  </div>
)
