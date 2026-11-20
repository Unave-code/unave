'use client'

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronUp,
  Citrus,
  Coffee,
  Cookie,
  MessageCircle,
  Minus,
  Moon,
  Plus,
  Sun,
} from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { Notice } from '@/components/Notice'
import { cn } from '@/utilities/ui'
import { whatsappHref } from '@/utilities/whatsapp'

/* ------------------------------------------------------------------ data */

type Slot = 'lunch' | 'dinner'
const SLOTS: Slot[] = ['lunch', 'dinner']

/** The kitchen sets one fixed meal per slot each week. Customers only add extras. */
const MEAL_PRICE = 219

const SLOT_INFO: Record<Slot, { label: string; time: string; Icon: typeof Sun }> = {
  lunch: { label: 'Lunch', time: '12:00 – 1:30 PM', Icon: Sun },
  dinner: { label: 'Dinner', time: '7:00 – 8:30 PM', Icon: Moon },
}

interface Meal {
  main: string
  carb: string
  sides: string[]
  kcal: number
  protein: number
}


const MENU: { day: string; full: string; lunch: Meal; dinner: Meal }[] = [
  {
    day: 'Mon', full: 'Monday',
    lunch: { main: 'Paneer Methi Malai', carb: 'Methi roti', sides: ['Kachumber salad', 'Dal fry', 'Beans poriyal'], kcal: 610, protein: 28 },
    dinner: { main: 'Chettinad Soya Curry', carb: 'Ragi roti', sides: ['Sprouts chaat', 'Rasam dal', 'Cabbage thoran'], kcal: 540, protein: 30 },
  },
  {
    day: 'Tue', full: 'Tuesday',
    lunch: { main: 'Tofu Tikka Masala', carb: 'Jowar roti', sides: ['Beetroot salad', 'Light dal makhani', 'Bhindi do pyaza'], kcal: 580, protein: 26 },
    dinner: { main: 'Palak Paneer', carb: 'Multigrain roti', sides: ['Corn chana salad', 'Moong dal', 'Lauki chana'], kcal: 600, protein: 27 },
  },
  {
    day: 'Wed', full: 'Wednesday',
    lunch: { main: 'Kolhapuri Paneer', carb: 'Bajra roti', sides: ['Koshimbir', 'Varan', 'Matki usal'], kcal: 620, protein: 29 },
    dinner: { main: 'Hariyali Tofu', carb: 'Oats roti', sides: ['Chickpea salad', 'Toor dal tadka', 'Mixed veg sabzi'], kcal: 530, protein: 25 },
  },
  {
    day: 'Thu', full: 'Thursday',
    lunch: { main: 'Rajma Masala Bowl', carb: 'Brown rice', sides: ['Carrot peanut salad', 'Jeera dal', 'Aloo methi'], kcal: 590, protein: 22 },
    dinner: { main: 'Kerala Veg Stew', carb: 'Coconut roti', sides: ['Moong sprout salad', 'Sambar', 'Avial'], kcal: 520, protein: 21 },
  },
  {
    day: 'Fri', full: 'Friday',
    lunch: { main: 'Kadhai Paneer', carb: 'Carrot roti', sides: ['Sprouted moong salad', 'Matki dal tadka', 'Capsicum besan subzi'], kcal: 610, protein: 28 },
    dinner: { main: 'No-Butter Soya Masala', carb: 'Dill multigrain roti', sides: ['Mixed bean salad', 'Homestyle chole', 'Aloo gobi'], kcal: 560, protein: 31 },
  },
  {
    day: 'Sat', full: 'Saturday',
    lunch: { main: 'Khurchan Paneer', carb: 'Soya roti', sides: ['Cucumber mint salad', 'Dal panchmel', 'Gajar matar'], kcal: 600, protein: 30 },
    dinner: { main: 'Lahori Tofu Curry', carb: 'Palak roti', sides: ['Bombay sprouts salad', 'Lobiya masala', 'Parwal bhujiya'], kcal: 540, protein: 26 },
  },
]

const WEEKS = [
  { id: 0, tab: 'This week', range: '23 – 28 Nov' },
  { id: 1, tab: 'Next week', range: '30 Nov – 5 Dec' },
]

const NEXT_MENU: typeof MENU = [
  {
    day: 'Mon', full: 'Monday',
    lunch: { main: 'Paneer Lababdar', carb: 'Bajra roti', sides: ['Cabbage carrot slaw', 'Dal tadka', 'Turai chana'], kcal: 600, protein: 28 },
    dinner: { main: 'Goan Tofu Xacuti', carb: 'Brown rice', sides: ['Kosambari', 'Masoor dal', 'Beans foogath'], kcal: 550, protein: 25 },
  },
  {
    day: 'Tue', full: 'Tuesday',
    lunch: { main: 'Soya Keema Matar', carb: 'Multigrain roti', sides: ['Tomato onion salad', 'Panchratna dal', 'Kaddu sabzi'], kcal: 570, protein: 32 },
    dinner: { main: 'Paneer Pasanda (light)', carb: 'Methi roti', sides: ['Sprouts salad', 'Kadhi', 'Baingan bharta'], kcal: 610, protein: 27 },
  },
  {
    day: 'Wed', full: 'Wednesday',
    lunch: { main: 'Chole Masala Bowl', carb: 'Jeera brown rice', sides: ['Kachumber', 'Lauki dal', 'Aloo shimla'], kcal: 590, protein: 21 },
    dinner: { main: 'Mangalorean Tofu Ghassi', carb: 'Ragi roti', sides: ['Cucumber peanut salad', 'Saaru', 'Beans palya'], kcal: 540, protein: 24 },
  },
  {
    day: 'Thu', full: 'Thursday',
    lunch: { main: 'Achari Paneer', carb: 'Jowar roti', sides: ['Beet carrot salad', 'Moong dal', 'Bhindi masala'], kcal: 620, protein: 29 },
    dinner: { main: 'Soya Rogan Josh', carb: 'Palak roti', sides: ['Chana chaat', 'Dal palak', 'Gobi matar'], kcal: 560, protein: 31 },
  },
  {
    day: 'Fri', full: 'Friday',
    lunch: { main: 'Tofu Kali Mirch', carb: 'Oats roti', sides: ['Corn salad', 'Arhar dal', 'Tinda masala'], kcal: 540, protein: 25 },
    dinner: { main: 'Paneer Do Pyaza', carb: 'Carrot roti', sides: ['Moong chaat', 'Dal makhani (light)', 'Mixed veg'], kcal: 600, protein: 28 },
  },
  {
    day: 'Sat', full: 'Saturday',
    lunch: { main: 'Rajasthani Gatte Curry', carb: 'Missi roti', sides: ['Kakdi raita salad', 'Panchmel dal', 'Ker sangri'], kcal: 580, protein: 22 },
    dinner: { main: 'Chettinad Paneer', carb: 'Ragi roti', sides: ['Sundal', 'Rasam', 'Cabbage poriyal'], kcal: 590, protein: 28 },
  },
]

const DURATIONS = [
  { weeks: 1, off: 0, label: '1 week', note: 'Try it out' },
  { weeks: 2, off: 5, label: '2 weeks', note: 'Save 5%' },
  { weeks: 4, off: 10, label: '4 weeks', note: 'Save 10%' },
]

interface Option {
  id: string
  label: string
  detail: string
  price: number
}

interface AddonGroup {
  id: string
  title: string
  hint: string
  Icon: typeof Sun
  /** single: pick one (including "none"); multi: pick any. */
  mode: 'single' | 'multi'
  options: Option[]
}

/** Placeholder extras and prices. Every price is per day. */
const ADDONS: AddonGroup[] = [
  {
    id: 'juice', title: 'Juice', hint: 'Cold-pressed, delivered with your first meal of the day.', Icon: Citrus, mode: 'single',
    options: [
      { id: 'none', label: 'No juice', detail: '', price: 0 },
      { id: 'normal', label: 'Fresh juice', detail: 'Seasonal fruit, no added sugar · 250 ml', price: 59 },
      { id: 'detox', label: 'Detox juice', detail: 'Amla, cucumber, mint and ginger · 250 ml', price: 89 },
    ],
  },
  {
    id: 'breakfast', title: 'Breakfast', hint: 'Delivered 7:30 – 9:00 AM, menu changes daily.', Icon: Coffee, mode: 'single',
    options: [
      { id: 'none', label: 'No breakfast', detail: '', price: 0 },
      { id: 'light', label: 'Light breakfast', detail: 'Oats bowl, poha or upma with fruit', price: 119 },
      { id: 'protein', label: 'Protein breakfast', detail: 'Besan chilla, paneer bhurji or smoothie bowl', price: 159 },
    ],
  },
  {
    id: 'snacks', title: 'Snacks & dessert', hint: 'Pick any. Packed with your lunch.', Icon: Cookie, mode: 'multi',
    options: [
      { id: 'sprouts', label: 'Sprouts snack box', detail: 'Chaat-style, 150 g', price: 69 },
      { id: 'fruit', label: 'Cut fruit bowl', detail: 'Three seasonal fruits', price: 79 },
      { id: 'dessert', label: 'Sugar-free dessert', detail: 'Ragi ladoo, kheer or date bar', price: 89 },
    ],
  },
]

const STEPS = ['This week', 'Meals & days', 'Add-ons', 'Review'] as const

/* --------------------------------------------------------------- helpers */

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

const focusRing = 'focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:outline-none'

/** A large selectable card used for every choice in the wizard. */
const ChoiceCard: React.FC<{
  selected: boolean
  onClick: () => void
  role?: 'radio' | 'checkbox'
  children: React.ReactNode
  className?: string
}> = ({ selected, onClick, role = 'radio', children, className }) => (
  <button
    aria-checked={selected}
    className={cn(
      'relative flex min-h-14 w-full flex-col items-start gap-1 rounded-2xl border-2 bg-white p-4 text-left transition-colors motion-reduce:transition-none',
      selected ? 'border-green-700 bg-green-50' : 'border-line hover:border-green-500',
      focusRing,
      className,
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

const FieldLabel: React.FC<{ id: string; children: React.ReactNode; hint?: string }> = ({ id, children, hint }) => (
  <div className="mb-3">
    <h3 className="text-ink-900 font-extrabold" id={id}>{children}</h3>
    {hint && <p className="text-ink-600 text-sm">{hint}</p>}
  </div>
)

/* -------------------------------------------------------------- builder */

export function PlanBuilder({ whatsapp }: { whatsapp: string | null }) {
  const [step, setStep] = useState(0)
  const [slots, setSlots] = useState<Record<Slot, boolean>>({ lunch: true, dinner: true })
  const [days, setDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  const [weeks, setWeeks] = useState(2)
  const [people, setPeople] = useState(1)
  const [picks, setPicks] = useState<Record<string, string[]>>({ juice: ['none'], breakfast: ['none'], snacks: [] })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [menuWeek, setMenuWeek] = useState(0)
  const weekMenu = menuWeek === 0 ? MENU : NEXT_MENU
  const weekInfo = WEEKS[menuWeek]
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  // Move focus to the new step heading so keyboard and screen reader users land in the right place.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    headingRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [step])

  const activeSlots = SLOTS.filter((s) => slots[s])
  const orderedDays = MENU.map((m) => m.day).filter((d) => days.includes(d))

  const toggleSlot = (s: Slot) => setSlots((c) => ({ ...c, [s]: !c[s] }))
  const toggleDay = (d: string) => setDays((c) => (c.includes(d) ? c.filter((x) => x !== d) : [...c, d]))

  const pick = (group: AddonGroup, id: string) =>
    setPicks((p) => {
      if (group.mode === 'single') return { ...p, [group.id]: [id] }
      const cur = p[group.id] ?? []
      return { ...p, [group.id]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] }
    })

  const chosenAddons = ADDONS.flatMap((g) =>
    g.options.filter((o) => o.price > 0 && (picks[g.id] ?? []).includes(o.id)).map((o) => ({ group: g.title, ...o })),
  )

  const totals = useMemo(() => {
    const mealsPerWeek = activeSlots.length * orderedDays.length * people
    const mealsCost = mealsPerWeek * MEAL_PRICE
    const addonPerDay = chosenAddons.reduce((t, a) => t + a.price, 0)
    const addonsCost = addonPerDay * orderedDays.length * people
    const weekly = mealsCost + addonsCost
    const off = DURATIONS.find((d) => d.weeks === weeks)!.off
    const gross = weekly * weeks
    const total = gross * (1 - off / 100)
    return { mealsPerWeek, mealsCost, addonsCost, weekly, gross, off, saved: gross - total, total }
  }, [activeSlots.length, orderedDays.length, people, chosenAddons, weeks])

  const stepValid = [true, activeSlots.length > 0 && orderedDays.length > 0, true, true]
  const canSend = stepValid[1]

  const message = [
    'Hi UNAVE, I would like to start this plan:',
    `• ${activeSlots.map((s) => SLOT_INFO[s].label).join(' + ')} on ${orderedDays.join(', ')}`,
    `• ${DURATIONS.find((d) => d.weeks === weeks)!.label} for ${people} ${people > 1 ? 'people' : 'person'}`,
    chosenAddons.length ? `• Add-ons: ${chosenAddons.map((a) => a.label).join(', ')}` : '• No add-ons',
    `• Estimated total ${inr(totals.total)}`,
  ].join('\n')
  const sendHref = whatsapp ? whatsappHref(whatsapp, message) : '/contact?message=' + encodeURIComponent(message)

  const go = (n: number) => setStep(Math.max(0, Math.min(STEPS.length - 1, n)))

  /* ------------------------------------------------------------ pieces */

  const sendButton = (className?: string) => (
    <a
      aria-disabled={!canSend}
      className={cn(
        'rounded-pill text-button inline-flex h-13 items-center justify-center gap-2 px-6 font-bold transition-colors focus-visible:ring-[3px] focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none',
        canSend ? 'bg-gold-400 text-green-700 hover:bg-gold-500' : 'pointer-events-none bg-gold-400/40 text-green-700/60',
        className,
      )}
      href={sendHref}
      rel="noopener noreferrer"
      target={whatsapp ? '_blank' : undefined}
    >
      <MessageCircle aria-hidden className="size-5" /> Message us this plan
    </a>
  )

  const breakdown = (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-cream/75">{totals.mealsPerWeek} meals a week × {inr(MEAL_PRICE)}</dt>
        <dd className="font-bold">{inr(totals.mealsCost)}</dd>
      </div>
      {chosenAddons.map((a) => (
        <div className="flex justify-between gap-4" key={a.group + a.id}>
          <dt className="text-cream/75">{a.label} × {orderedDays.length * people}</dt>
          <dd className="font-bold">{inr(a.price * orderedDays.length * people)}</dd>
        </div>
      ))}
      <div className="border-cream/15 flex justify-between gap-4 border-t pt-2">
        <dt className="text-cream/75">Weekly × {weeks}</dt>
        <dd className="font-bold">{inr(totals.gross)}</dd>
      </div>
      {totals.off > 0 && (
        <div className="text-gold-400 flex justify-between gap-4">
          <dt>{totals.off}% longer-plan saving</dt>
          <dd className="font-bold">−{inr(totals.saved)}</dd>
        </div>
      )}
    </dl>
  )

  /* ------------------------------------------------------------- steps */

  const stepBody = [
    // 1. Meals & days
    <div className="space-y-8" key="s1">
      <div role="group" aria-labelledby="lbl-slots">
        <FieldLabel id="lbl-slots" hint="Choose one or both.">Which meals?</FieldLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          {SLOTS.map((s) => {
            const { Icon, label, time } = SLOT_INFO[s]
            return (
              <ChoiceCard key={s} onClick={() => toggleSlot(s)} role="checkbox" selected={slots[s]}>
                <Icon aria-hidden className="text-gold-600 size-6" />
                <span className="text-ink-900 mt-1 font-extrabold">{label}</span>
                <span className="text-ink-600 text-sm">Delivered {time}</span>
              </ChoiceCard>
            )
          })}
        </div>
      </div>

      <div role="group" aria-labelledby="lbl-days">
        <FieldLabel id="lbl-days" hint="We deliver Monday to Saturday.">Which days?</FieldLabel>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {MENU.map((m) => {
            const on = days.includes(m.day)
            return (
              <button
                aria-label={m.full}
                aria-pressed={on}
                className={cn(
                  'flex h-14 items-center justify-center rounded-xl border-2 font-extrabold transition-colors motion-reduce:transition-none',
                  on ? 'border-green-700 bg-green-700 text-white' : 'border-line text-ink-900 bg-white hover:border-green-500',
                  focusRing,
                )}
                key={m.day}
                onClick={() => toggleDay(m.day)}
                type="button"
              >
                {m.day}
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex gap-4 text-sm">
          <button className={cn('min-h-11 font-bold text-green-700 underline-offset-4 hover:underline', focusRing)} onClick={() => setDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])} type="button">Weekdays</button>
          <button className={cn('min-h-11 font-bold text-green-700 underline-offset-4 hover:underline', focusRing)} onClick={() => setDays(MENU.map((m) => m.day))} type="button">All six days</button>
        </div>
      </div>

      <div role="radiogroup" aria-labelledby="lbl-dur">
        <FieldLabel id="lbl-dur">How long?</FieldLabel>
        <div className="grid gap-3 sm:grid-cols-3">
          {DURATIONS.map((d) => (
            <ChoiceCard key={d.weeks} onClick={() => setWeeks(d.weeks)} selected={weeks === d.weeks}>
              <span className="text-ink-900 font-extrabold">{d.label}</span>
              <span className={cn('text-sm', d.off ? 'font-bold text-gold-600' : 'text-ink-600')}>{d.note}</span>
            </ChoiceCard>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel id="lbl-people" hint="Each person gets their own portion.">How many people?</FieldLabel>
        <div aria-labelledby="lbl-people" className="border-line rounded-pill inline-flex items-center border-2 bg-white" role="group">
          <button aria-label="One fewer person" className={cn('grid size-12 place-items-center rounded-full hover:bg-green-50 disabled:opacity-40', focusRing)} disabled={people <= 1} onClick={() => setPeople((p) => p - 1)} type="button">
            <Minus aria-hidden className="size-4" />
          </button>
          <span aria-live="polite" className="w-10 text-center text-lg font-extrabold">{people}</span>
          <button aria-label="One more person" className={cn('grid size-12 place-items-center rounded-full hover:bg-green-50 disabled:opacity-40', focusRing)} disabled={people >= 6} onClick={() => setPeople((p) => p + 1)} type="button">
            <Plus aria-hidden className="size-4" />
          </button>
        </div>
      </div>
    </div>,

    // 2. This week's menu (read-only table)
    <div key="s2">
      <p className="text-ink-600">
        The kitchen sets one balanced meal for each slot, and the menu changes every week. You pick your days
        and meals in the next step; anything outside your plan shows greyed out.
      </p>
      <div aria-label="Menu week" className="bg-green-50 border-line mt-5 inline-flex gap-1 rounded-full border p-1" role="tablist">
        {WEEKS.map((w) => (
          <button
            aria-controls="menu-table"
            aria-selected={menuWeek === w.id}
            className={cn(
              'rounded-pill flex min-h-11 flex-col items-center justify-center px-5 leading-tight transition-colors motion-reduce:transition-none',
              menuWeek === w.id ? 'bg-green-700 text-white shadow-sm' : 'text-green-700 hover:bg-green-100',
              focusRing,
            )}
            key={w.id}
            onClick={() => setMenuWeek(w.id)}
            role="tab"
            type="button"
          >
            <span className="text-sm font-extrabold">{w.tab}</span>
            <span className={cn('text-xs', menuWeek === w.id ? 'text-cream/80' : 'text-ink-600')}>{w.range}</span>
          </button>
        ))}
      </div>
      <div className="border-line mt-4 overflow-x-auto rounded-2xl border" id="menu-table" role="tabpanel">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <caption className="sr-only">Menu for {weekInfo.tab.toLowerCase()}, {weekInfo.range}</caption>
          <thead>
            <tr className="bg-green-100 text-green-700">
              <th className="w-24 px-4 py-3 font-extrabold" scope="col">Day</th>
              {SLOTS.map((sl) => {
                const { Icon, label, time } = SLOT_INFO[sl]
                return (
                  <th className={cn('px-4 py-3', !slots[sl] && 'opacity-50')} key={sl} scope="col">
                    <span className="flex items-center gap-2 font-extrabold">
                      <Icon aria-hidden className="text-gold-600 size-4" /> {label}
                    </span>
                    <span className="text-ink-600 block text-xs font-normal">{slots[sl] ? time : 'Not in your plan'}</span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-line divide-y bg-white">
            {weekMenu.map((m) => {
              const inPlan = days.includes(m.day)
              return (
                <tr className={cn('align-top', !inPlan && 'bg-cream/60')} key={m.day}>
                  <th className="px-4 py-4" scope="row">
                    <span className={cn('block font-extrabold', inPlan ? 'text-green-700' : 'text-ink-400')}>{m.day}</span>
                    {inPlan ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-green-500">
                        <Check aria-hidden className="size-3" /> In plan
                      </span>
                    ) : (
                      <span className="text-ink-400 mt-1 block text-xs">Not in plan</span>
                    )}
                  </th>
                  {SLOTS.map((sl) => {
                    const meal = m[sl]
                    const on = inPlan && slots[sl]
                    return (
                      <td className={cn('px-4 py-4', !on && 'opacity-50')} key={sl}>
                        <p className="text-ink-900 font-extrabold">{meal.main}</p>
                        <p className="text-ink-600 text-xs">with {meal.carb}</p>
                        <p className="text-ink-600 mt-2 text-xs leading-5">{meal.sides.join(' · ')}</p>
                        <p className="mt-2 text-xs">
                          <strong className="text-ink-900">~{meal.kcal}</strong> <span className="text-ink-600">kcal ·</span>{' '}
                          <strong className="text-ink-900">{meal.protein} g</strong> <span className="text-ink-600">protein</span>
                        </p>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-ink-600 mt-3 text-xs">Calories and protein are kitchen estimates for one portion, not lab values.</p>
    </div>,

    // 3. Add-ons
    <div className="space-y-8" key="s3">
      <p className="text-ink-600">Optional extras, delivered on every day of your plan. Prices are per day, per person.</p>
      {ADDONS.map((g) => (
        <div aria-labelledby={'lbl-' + g.id} key={g.id} role={g.mode === 'single' ? 'radiogroup' : 'group'}>
          <div className="mb-3 flex items-start gap-3">
            <span className="bg-gold-100 grid size-10 shrink-0 place-items-center rounded-xl">
              <g.Icon aria-hidden className="text-gold-600 size-5" />
            </span>
            <div>
              <h3 className="text-ink-900 font-extrabold" id={'lbl-' + g.id}>{g.title}</h3>
              <p className="text-ink-600 text-sm">{g.hint}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {g.options.map((o) => (
              <ChoiceCard
                key={o.id}
                onClick={() => pick(g, o.id)}
                role={g.mode === 'single' ? 'radio' : 'checkbox'}
                selected={(picks[g.id] ?? []).includes(o.id)}
              >
                <span className="text-ink-900 pr-8 font-extrabold">{o.label}</span>
                {o.detail && <span className="text-ink-600 text-sm">{o.detail}</span>}
                <span className={cn('mt-auto pt-1 text-sm font-bold', o.price ? 'text-green-700' : 'text-ink-400')}>
                  {o.price ? '+' + inr(o.price) + ' a day' : 'Included'}
                </span>
              </ChoiceCard>
            ))}
          </div>
        </div>
      ))}
      <p className="rounded-2xl bg-green-100 px-5 py-4 text-sm text-green-700">
        Need something else, like an extra portion or a meal for a guest? Mention it in your message. Once we confirm your
        plan, we can add anything.
      </p>
    </div>,

    // 4. Review
    <div className="space-y-6" key="s4">
      <dl className="border-line divide-line divide-y rounded-2xl border bg-white">
        {[
          { label: 'Meals', value: activeSlots.map((s) => SLOT_INFO[s].label).join(' and ') || 'None picked', to: 1 },
          { label: 'Days', value: orderedDays.join(', ') || 'None picked', to: 1 },
          { label: 'Duration', value: DURATIONS.find((d) => d.weeks === weeks)!.label + ', ' + people + (people > 1 ? ' people' : ' person'), to: 1 },
          { label: 'Add-ons', value: chosenAddons.map((a) => a.label).join(', ') || 'None', to: 2 },
        ].map((r) => (
          <div className="flex items-center gap-4 px-5 py-4" key={r.label}>
            <dt className="text-ink-600 w-24 shrink-0 text-sm">{r.label}</dt>
            <dd className="text-ink-900 min-w-0 flex-1 font-bold">{r.value}</dd>
            <button className={cn('min-h-11 px-2 text-sm font-bold text-green-700 underline-offset-4 hover:underline', focusRing)} onClick={() => go(r.to)} type="button">
              Change<span className="sr-only"> {r.label.toLowerCase()}</span>
            </button>
          </div>
        ))}
      </dl>
      <Notice title="Cooking around a health need?">
        Tell us about allergies, diabetes or a diet your doctor gave you in your message. We cook to your notes, but our
        meals are not medical treatment and we can&apos;t promise any result.
      </Notice>
      <p className="text-ink-600 text-sm">
        Nothing is charged now. Your plan opens in WhatsApp as a message. We reply to confirm the start date, address and
        final price. No account needed.
      </p>
    </div>,
  ]

  /* -------------------------------------------------------------- page */

  return (
    <main className="bg-cream pb-28 lg:pb-0">
      <section className="bg-green-900 text-cream">
        <div className="container py-10 md:py-14">
          <p className="text-eyebrow text-gold-400 uppercase">Plan builder</p>
          <h1 className="text-hero mt-3 max-w-[22ch] font-extrabold text-balance">
            Set up your <span className="text-gold-400 italic">weekly meals</span> in four steps
          </h1>
          <p className="text-lead text-cream/85 mt-3 max-w-[56ch]">
            See this week&apos;s home-style menu, choose when we deliver and any extras, then send it to us by message.
          </p>
        </div>
      </section>

      <div className="container grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:py-12">
        <div className="min-w-0">
          {/* Progress */}
          <nav aria-label="Steps">
            <ol className="grid grid-cols-4 gap-2">
              {STEPS.map((label, i) => {
                const done = i < step
                const current = i === step
                const reachable = i <= step || stepValid.slice(0, i).every(Boolean)
                return (
                  <li key={label}>
                    <button
                      aria-current={current ? 'step' : undefined}
                      className={cn('group flex w-full flex-col gap-2 rounded-lg pt-1 text-left disabled:cursor-not-allowed', focusRing)}
                      disabled={!reachable}
                      onClick={() => go(i)}
                      type="button"
                    >
                      <span className={cn('h-1.5 w-full rounded-full transition-colors motion-reduce:transition-none', done || current ? 'bg-green-700' : 'bg-line')} />
                      <span className={cn('flex items-center gap-1.5 text-xs font-bold sm:text-sm', current ? 'text-green-700' : done ? 'text-ink-900' : 'text-ink-400')}>
                        {done ? <Check aria-hidden className="size-4 text-green-700" /> : <span className="hidden sm:inline">{i + 1}.</span>}
                        <span className="truncate">{label}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </nav>

          <section aria-labelledby="step-heading" className="border-line mt-6 rounded-3xl border bg-white p-5 shadow-sm sm:p-8">
            <p className="text-eyebrow text-gold-600 uppercase">Step {step + 1} of {STEPS.length}</p>
            <h2 className="text-ink-900 mt-1 mb-6 scroll-mt-28 text-2xl font-extrabold outline-none" id="step-heading" ref={headingRef} tabIndex={-1}>
              {["This week's menu", 'When should we deliver?', 'Add extras', 'Check and send'][step]}
            </h2>
            {[stepBody[1], stepBody[0], stepBody[2], stepBody[3]][step]}

            <div className="border-line mt-8 flex items-center justify-between gap-3 border-t pt-6">
              {step > 0 ? (
                <button className={cn('rounded-pill inline-flex h-12 items-center gap-2 border-2 border-green-700 px-5 font-bold text-green-700 hover:bg-green-50', focusRing)} onClick={() => go(step - 1)} type="button">
                  <ArrowLeft aria-hidden className="size-4" /> Back
                </button>
              ) : <span />}
              {step < STEPS.length - 1 ? (
                <div className="flex items-center gap-3">
                  {!stepValid[step] && <p className="text-sm text-[#B3261E]" role="status">Pick at least one meal and one day.</p>}
                  <button
                    className={cn('rounded-pill inline-flex h-12 items-center gap-2 bg-green-700 px-6 font-bold text-white hover:bg-green-600 disabled:opacity-40', focusRing)}
                    disabled={!stepValid[step]}
                    onClick={() => go(step + 1)}
                    type="button"
                  >
                    {step === STEPS.length - 2 ? 'Review plan' : 'Next'} <ArrowRight aria-hidden className="size-4" />
                  </button>
                </div>
              ) : (
                <span className="hidden sm:block"><span className="sr-only">Send from the summary</span></span>
              )}
            </div>
          </section>
        </div>

        {/* Desktop summary */}
        <aside aria-labelledby="summary-heading" className="hidden lg:sticky lg:top-24 lg:block">
          <div className="text-cream rounded-3xl bg-green-700 p-6 shadow-md">
            <h2 className="text-lg font-extrabold" id="summary-heading">Your plan</h2>
            <p className="text-cream/70 mt-1 text-sm">
              {activeSlots.map((s) => SLOT_INFO[s].label).join(' + ') || 'No meals'} · {orderedDays.length} days · {weeks} wk
            </p>
            <div className="mt-5">{breakdown}</div>
            <div className="border-cream/20 mt-4 flex items-end justify-between border-t pt-4">
              <span className="text-cream/75 text-sm">Estimated total</span>
              <span aria-live="polite" className="text-gold-400 text-3xl font-extrabold">{inr(totals.total)}</span>
            </div>
            {step === STEPS.length - 1 ? (
              sendButton('mt-6 w-full')
            ) : (
              <p className="text-cream/70 mt-6 text-center text-xs">Finish the steps to send your plan.</p>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile sticky bar */}
      <div className="border-cream/10 text-cream fixed inset-x-0 bottom-0 z-40 border-t bg-green-800 shadow-lg lg:hidden">
        {sheetOpen && (
          <div className="container border-cream/10 border-b py-4" id="mobile-breakdown">
            {breakdown}
          </div>
        )}
        <div className="container flex items-center gap-3 py-3">
          <button
            aria-controls="mobile-breakdown"
            aria-expanded={sheetOpen}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left focus-visible:ring-[3px] focus-visible:ring-gold-400 focus-visible:outline-none"
            onClick={() => setSheetOpen((o) => !o)}
            type="button"
          >
            <span className="min-w-0">
              <span className="text-cream/70 block text-xs">Estimated total</span>
              <span aria-live="polite" className="text-gold-400 block text-xl font-extrabold">{inr(totals.total)}</span>
            </span>
            <ChevronUp aria-hidden className={cn('size-5 shrink-0 transition-transform motion-reduce:transition-none', !sheetOpen && 'rotate-180')} />
            <span className="sr-only">{sheetOpen ? 'Hide' : 'Show'} price breakdown</span>
          </button>
          {step === STEPS.length - 1 ? (
            sendButton('h-12 px-5 text-sm')
          ) : (
            <button
              className="rounded-pill bg-gold-400 hover:bg-gold-500 inline-flex h-12 items-center gap-2 px-5 text-sm font-bold text-green-700 focus-visible:ring-[3px] focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-40"
              disabled={!stepValid[step]}
              onClick={() => go(step + 1)}
              type="button"
            >
              Next <ArrowRight aria-hidden className="size-4" />
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
