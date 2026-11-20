'use client'

import { Check, ChevronDown, Clock, Flame, Info, Leaf, MessageCircle, Minus, Plus, Sun, Moon } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import { Notice } from '@/components/Notice'
import { cn } from '@/utilities/ui'
import { whatsappHref } from '@/utilities/whatsapp'

/* ------------------------------------------------------------------ data */

type ProteinId = 'paneer' | 'tofu' | 'soya' | 'egg' | 'chicken'
type CarbId = 'roti' | 'brown' | 'white'
type Slot = 'lunch' | 'dinner'

const PROTEINS: { id: ProteinId; label: string; veg: 'veg' | 'egg' | 'nonveg'; price: number; protein: number; kcal: number }[] = [
  { id: 'paneer', label: 'Paneer', veg: 'veg', price: 229, protein: 28, kcal: 610 },
  { id: 'tofu', label: 'Tofu', veg: 'veg', price: 219, protein: 24, kcal: 540 },
  { id: 'soya', label: 'Soya chunks', veg: 'veg', price: 199, protein: 30, kcal: 520 },
  { id: 'egg', label: 'Egg whites', veg: 'egg', price: 209, protein: 27, kcal: 480 },
  { id: 'chicken', label: 'Chicken', veg: 'nonveg', price: 249, protein: 35, kcal: 560 },
]

const CARBS: { id: CarbId; label: string; kcal: number }[] = [
  { id: 'roti', label: 'Roti of the day', kcal: 0 },
  { id: 'brown', label: 'Brown rice', kcal: 20 },
  { id: 'white', label: 'White rice', kcal: 40 },
]

interface Meal {
  main: string
  roti: string
  sides: [string, string, string]
}

const MENU: { day: string; lunch: Meal; dinner: Meal }[] = [
  {
    day: 'Mon',
    lunch: { main: 'Methi Malai Curry', roti: 'Methi Roti', sides: ['Kachumber Salad', 'Dal Fry', 'Beans Poriyal'] },
    dinner: { main: 'Chettinad Curry', roti: 'Ragi Roti', sides: ['Sprouts Chaat', 'Rasam Dal', 'Cabbage Thoran'] },
  },
  {
    day: 'Tue',
    lunch: { main: 'Tikka Masala', roti: 'Jowar Roti', sides: ['Beetroot Raita Salad', 'Dal Makhani (light)', 'Bhindi Do Pyaza'] },
    dinner: { main: 'Palak Curry', roti: 'Multigrain Roti', sides: ['Corn Chana Salad', 'Moong Dal', 'Lauki Chana'] },
  },
  {
    day: 'Wed',
    lunch: { main: 'Kolhapuri Curry', roti: 'Bajra Roti', sides: ['Koshimbir', 'Varan', 'Matki Usal'] },
    dinner: { main: 'Hariyali Curry', roti: 'Oats Roti', sides: ['Chickpea Salad', 'Toor Dal Tadka', 'Mixed Veg Sabzi'] },
  },
  {
    day: 'Thu',
    lunch: { main: 'Rogan Curry', roti: 'Beet Roti', sides: ['Carrot Peanut Salad', 'Rajma', 'Aloo Methi'] },
    dinner: { main: 'Kerala Stew', roti: 'Coconut Roti', sides: ['Moong Sprout Salad', 'Sambar', 'Avial'] },
  },
  {
    day: 'Fri',
    lunch: { main: 'Kadhai Curry', roti: 'Carrot Roti', sides: ['Sprouted Moong Salad', 'Matki Dal Tadka', 'Capsicum Besan Subzi'] },
    dinner: { main: 'No-Butter Masala', roti: 'Dill Multigrain Roti', sides: ['Mixed Bean Salad', 'Homestyle Chole', 'Aloo Gobi'] },
  },
  {
    day: 'Sat',
    lunch: { main: 'Khurchan Curry', roti: 'Soya Roti', sides: ['Cucumber Mint Salad', 'Dal Panchmel', 'Gajar Matar'] },
    dinner: { main: 'Lahori Curry', roti: 'Palak Roti', sides: ['Bombay Sprouts Salad', 'Lobiya Masala', 'Parwal Bhujiya'] },
  },
]

const WEEK_OPTIONS = [
  { weeks: 1, off: 0, label: '1 week' },
  { weeks: 2, off: 5, label: '2 weeks' },
  { weeks: 4, off: 10, label: '4 weeks' },
]

const SLOT_TIMES: Record<Slot, string> = { lunch: '12:00 – 1:30 PM', dinner: '7:00 – 8:30 PM' }

/* --------------------------------------------------------------- helpers */

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
const proteinOf = (id: ProteinId) => PROTEINS.find((p) => p.id === id)!
const carbOf = (id: CarbId) => CARBS.find((c) => c.id === id)!

type Choice = { protein: ProteinId; carb: CarbId; skip: boolean }
type Overrides = Record<string, Partial<Choice>> // key: "Mon-lunch"

const DietDot: React.FC<{ kind: 'veg' | 'egg' | 'nonveg'; className?: string }> = ({ kind, className }) => (
  <span
    aria-label={kind === 'veg' ? 'Vegetarian' : kind === 'egg' ? 'Contains egg' : 'Non-vegetarian'}
    className={cn(
      'inline-grid size-3.5 shrink-0 place-items-center rounded-[3px] border-[1.5px]',
      kind === 'veg' && 'border-[#2E8B57]',
      kind === 'egg' && 'border-gold-600',
      kind === 'nonveg' && 'border-[#B3261E]',
      className,
    )}
    role="img"
  >
    <span
      className={cn(
        'size-1.5 rounded-full',
        kind === 'veg' && 'bg-[#2E8B57]',
        kind === 'egg' && 'bg-gold-600',
        kind === 'nonveg' && 'bg-[#B3261E]',
      )}
    />
  </span>
)

/** A pill toggle; every option row is a radio group built from these. */
const Chip: React.FC<{
  active: boolean
  children: React.ReactNode
  onClick: () => void
  className?: string
}> = ({ active, children, onClick, className }) => (
  <button
    aria-pressed={active}
    className={cn(
      'rounded-pill inline-flex min-h-11 items-center gap-2 border-2 px-4 text-sm font-bold transition-colors focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none motion-reduce:transition-none',
      active
        ? 'border-green-700 bg-green-700 text-white'
        : 'border-line text-ink-900 bg-white hover:border-green-500',
      className,
    )}
    onClick={onClick}
    type="button"
  >
    {active && <Check aria-hidden className="size-4" />}
    {children}
  </button>
)

const StepHeading: React.FC<{ n: number; title: string; hint?: string }> = ({ n, title, hint }) => (
  <div className="mb-4 flex items-start gap-3">
    <span className="bg-gold-400 grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold text-green-700">
      {n}
    </span>
    <div>
      <h2 className="text-ink-900 text-lg font-extrabold">{title}</h2>
      {hint && <p className="text-ink-600 text-sm">{hint}</p>}
    </div>
  </div>
)

/* -------------------------------------------------------------- builder */

export function PlanBuilder({ whatsapp }: { whatsapp: string | null }) {
  const [slots, setSlots] = useState<Record<Slot, boolean>>({ lunch: true, dinner: true })
  const [days, setDays] = useState<string[]>(MENU.map((d) => d.day).slice(0, 5))
  const [weeks, setWeeks] = useState(2)
  const [protein, setProtein] = useState<ProteinId>('paneer')
  const [carb, setCarb] = useState<CarbId>('roti')
  const [overrides, setOverrides] = useState<Overrides>({})
  const [openDay, setOpenDay] = useState(MENU[0].day)
  const [people, setPeople] = useState(1)

  const choiceFor = (day: string, slot: Slot): Choice => ({
    protein,
    carb,
    skip: false,
    ...overrides[day + '-' + slot],
  })

  const setOverride = (day: string, slot: Slot, patch: Partial<Choice>) =>
    setOverrides((o) => ({ ...o, [day + '-' + slot]: { ...o[day + '-' + slot], ...patch } }))

  const toggleDay = (d: string) =>
    setDays((cur) => (cur.includes(d) ? (cur.length > 1 ? cur.filter((x) => x !== d) : cur) : MENU.map((m) => m.day).filter((x) => x === d || cur.includes(x))))

  const toggleSlot = (s: Slot) =>
    setSlots((cur) => {
      const next = { ...cur, [s]: !cur[s] }
      return next.lunch || next.dinner ? next : cur
    })

  const summary = useMemo(() => {
    const meals: { day: string; slot: Slot; choice: Choice }[] = []
    for (const m of MENU) {
      if (!days.includes(m.day)) continue
      for (const s of ['lunch', 'dinner'] as Slot[]) {
        if (!slots[s]) continue
        const c = choiceFor(m.day, s)
        if (!c.skip) meals.push({ day: m.day, slot: s, choice: c })
      }
    }
    const weekly = meals.reduce((t, m) => t + proteinOf(m.choice.protein).price, 0) * people
    const off = WEEK_OPTIONS.find((w) => w.weeks === weeks)!.off
    const gross = weekly * weeks
    const total = gross * (1 - off / 100)
    const perDayProtein = meals.length
      ? meals.reduce((t, m) => t + proteinOf(m.choice.protein).protein, 0) / new Set(meals.map((m) => m.day)).size
      : 0
    const perDayKcal = meals.length
      ? meals.reduce((t, m) => t + proteinOf(m.choice.protein).kcal + carbOf(m.choice.carb).kcal, 0) /
        new Set(meals.map((m) => m.day)).size
      : 0
    return { meals, weekly, gross, total, off, saved: gross - total, perDayProtein, perDayKcal }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, slots, weeks, protein, carb, overrides, people])

  const message = [
    'Hi UNAVE, I would like to start this plan:',
    `• ${weeks} week(s), ${days.join(', ')}`,
    `• ${(['lunch', 'dinner'] as Slot[]).filter((s) => slots[s]).join(' + ')} for ${people} ${people > 1 ? 'people' : 'person'}`,
    `• Usually ${proteinOf(protein).label} with ${carbOf(carb).label.toLowerCase()}`,
    ...Object.entries(overrides)
      .filter(([k]) => days.includes(k.split('-')[0]) && slots[k.split('-')[1] as Slot])
      .map(([k, v]) =>
        v.skip
          ? `• Skip ${k.replace('-', ' ')}`
          : `• ${k.replace('-', ' ')}: ${v.protein ? proteinOf(v.protein).label : ''} ${v.carb ? carbOf(v.carb).label.toLowerCase() : ''}`.trim(),
      ),
    `• ${summary.meals.length * people} meals a week, about ${inr(summary.total)} in total`,
  ].join('\n')

  const ctaHref = whatsapp ? whatsappHref(whatsapp, message) : '/contact?message=' + encodeURIComponent(message)

  return (
    <main className="bg-cream">
      {/* Hero */}
      <section className="bg-green-900 text-cream">
        <div className="container py-12 md:py-16">
          <p className="text-eyebrow text-gold-400 uppercase">Plan builder · prototype</p>
          <h1 className="text-hero mt-3 max-w-[22ch] font-extrabold text-balance">
            Build your week of <span className="text-gold-400 italic">home-style</span> meals
          </h1>
          <p className="text-lead text-cream/85 mt-4 max-w-[56ch]">
            Choose when you eat, pick your protein, and swap any meal you like. The price updates as you go. No account
            needed: send it to us and we confirm by message.
          </p>
          <ul className="text-cream/80 mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li className="flex items-center gap-2"><Leaf aria-hidden className="text-gold-400 size-4" />New menu every week</li>
            <li className="flex items-center gap-2"><Flame aria-hidden className="text-gold-400 size-4" />Protein and calories shown per meal</li>
            <li className="flex items-center gap-2"><Clock aria-hidden className="text-gold-400 size-4" />Pause or skip any meal</li>
          </ul>
        </div>
      </section>

      <div className="container grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="min-w-0 space-y-6">
          {/* Step 1 */}
          <section className="border-line rounded-2xl border bg-white p-6 shadow-sm">
            <StepHeading n={1} title="When do you want meals?" hint="Pick at least one meal and one day." />
            <div className="space-y-5">
              <fieldset>
                <legend className="text-ink-600 mb-2 text-sm font-bold">Meals</legend>
                <div className="flex flex-wrap gap-2">
                  <Chip active={slots.lunch} onClick={() => toggleSlot('lunch')}>
                    <Sun aria-hidden className="size-4" /> Lunch <span className="font-normal opacity-75">{SLOT_TIMES.lunch}</span>
                  </Chip>
                  <Chip active={slots.dinner} onClick={() => toggleSlot('dinner')}>
                    <Moon aria-hidden className="size-4" /> Dinner <span className="font-normal opacity-75">{SLOT_TIMES.dinner}</span>
                  </Chip>
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-ink-600 mb-2 text-sm font-bold">Days</legend>
                <div className="flex flex-wrap gap-2">
                  {MENU.map((m) => (
                    <Chip active={days.includes(m.day)} key={m.day} onClick={() => toggleDay(m.day)}>
                      {m.day}
                    </Chip>
                  ))}
                </div>
              </fieldset>
              <div className="flex flex-wrap gap-8">
                <fieldset>
                  <legend className="text-ink-600 mb-2 text-sm font-bold">How long</legend>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_OPTIONS.map((w) => (
                      <Chip active={weeks === w.weeks} key={w.weeks} onClick={() => setWeeks(w.weeks)}>
                        {w.label}
                        {w.off > 0 && (
                          <span className={cn('rounded-pill px-2 py-0.5 text-xs', weeks === w.weeks ? 'bg-gold-400 text-green-700' : 'bg-gold-100 text-[#8A5A00]')}>
                            {w.off}% off
                          </span>
                        )}
                      </Chip>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="text-ink-600 mb-2 text-sm font-bold">People</legend>
                  <div className="border-line rounded-pill inline-flex items-center border-2 bg-white">
                    <button aria-label="One fewer person" className="grid size-11 place-items-center rounded-full hover:bg-green-50 disabled:opacity-40" disabled={people <= 1} onClick={() => setPeople((p) => p - 1)} type="button">
                      <Minus aria-hidden className="size-4" />
                    </button>
                    <span aria-live="polite" className="w-8 text-center font-bold">{people}</span>
                    <button aria-label="One more person" className="grid size-11 place-items-center rounded-full hover:bg-green-50 disabled:opacity-40" disabled={people >= 6} onClick={() => setPeople((p) => p + 1)} type="button">
                      <Plus aria-hidden className="size-4" />
                    </button>
                  </div>
                </fieldset>
              </div>
            </div>
          </section>

          {/* Step 2 */}
          <section className="border-line rounded-2xl border bg-white p-6 shadow-sm">
            <StepHeading n={2} title="Your usual protein and carb" hint="This fills every meal. You can change single meals in step 3." />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {PROTEINS.map((p) => (
                <button
                  aria-pressed={protein === p.id}
                  className={cn(
                    'flex min-h-11 flex-col gap-1 rounded-xl border-2 p-4 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none motion-reduce:transition-none',
                    protein === p.id ? 'border-green-700 bg-green-50' : 'border-line hover:border-green-500',
                  )}
                  key={p.id}
                  onClick={() => setProtein(p.id)}
                  type="button"
                >
                  <span className="flex items-center gap-2 font-bold">
                    <DietDot kind={p.veg} /> {p.label}
                    {protein === p.id && <Check aria-hidden className="ml-auto size-4 text-green-700" />}
                  </span>
                  <span className="text-ink-600 text-sm">{p.protein} g protein · ~{p.kcal} kcal</span>
                  <span className="text-sm font-bold text-green-700">{inr(p.price)} a meal</span>
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {CARBS.map((c) => (
                <Chip active={carb === c.id} key={c.id} onClick={() => setCarb(c.id)}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </section>

          {/* Step 3 */}
          <section className="border-line rounded-2xl border bg-white p-6 shadow-sm">
            <StepHeading n={3} title="This week's menu" hint="Every meal: a salad, a dal, a sabzi and a main curry with your protein. Tap a day to swap or skip." />
            <div className="space-y-3">
              {MENU.filter((m) => days.includes(m.day)).map((m) => {
                const open = openDay === m.day
                return (
                  <div className="border-line overflow-hidden rounded-xl border" key={m.day}>
                    <button
                      aria-expanded={open}
                      className="flex min-h-14 w-full items-center gap-3 px-4 text-left hover:bg-green-50 focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none focus-visible:ring-inset"
                      onClick={() => setOpenDay(open ? '' : m.day)}
                      type="button"
                    >
                      <span className="w-10 font-extrabold text-green-700">{m.day}</span>
                      <span className="text-ink-600 min-w-0 flex-1 truncate text-sm">
                        {(['lunch', 'dinner'] as Slot[])
                          .filter((s) => slots[s])
                          .map((s) => (choiceFor(m.day, s).skip ? 'Skipped' : m[s].main))
                          .join(' · ')}
                      </span>
                      <ChevronDown aria-hidden className={cn('size-5 shrink-0 transition-transform motion-reduce:transition-none', open && 'rotate-180')} />
                    </button>
                    {open && (
                      <div className="grid gap-4 border-t border-line bg-green-50/50 p-4 md:grid-cols-2">
                        {(['lunch', 'dinner'] as Slot[])
                          .filter((s) => slots[s])
                          .map((s) => {
                            const meal = m[s]
                            const c = choiceFor(m.day, s)
                            const p = proteinOf(c.protein)
                            const carbLabel = c.carb === 'roti' ? meal.roti : carbOf(c.carb).label
                            return (
                              <article className={cn('rounded-xl border border-line bg-white p-4', c.skip && 'opacity-60')} key={s}>
                                <header className="flex items-center gap-2">
                                  {s === 'lunch' ? <Sun aria-hidden className="text-gold-600 size-4" /> : <Moon aria-hidden className="text-gold-600 size-4" />}
                                  <span className="text-eyebrow text-ink-600 uppercase">{s} · {SLOT_TIMES[s]}</span>
                                </header>
                                <h3 className="mt-2 flex items-center gap-2 font-extrabold text-ink-900">
                                  <DietDot kind={p.veg} />
                                  {p.label} {meal.main}
                                </h3>
                                <p className="text-ink-600 text-sm">with {carbLabel}</p>
                                <ul className="mt-3 flex flex-wrap gap-1.5">
                                  {meal.sides.map((side) => (
                                    <li className="rounded-pill bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700" key={side}>{side}</li>
                                  ))}
                                </ul>
                                <p className="text-ink-600 mt-3 text-xs">
                                  ~{p.kcal + carbOf(c.carb).kcal} kcal · {p.protein} g protein · {inr(p.price)}
                                </p>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <label className="sr-only" htmlFor={m.day + s + 'p'}>Protein for {m.day} {s}</label>
                                  <select
                                    className="border-line min-h-11 rounded-lg border-2 bg-white px-2 text-sm"
                                    disabled={c.skip}
                                    id={m.day + s + 'p'}
                                    onChange={(e) => setOverride(m.day, s, { protein: e.target.value as ProteinId })}
                                    value={c.protein}
                                  >
                                    {PROTEINS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                                  </select>
                                  <label className="sr-only" htmlFor={m.day + s + 'c'}>Carb for {m.day} {s}</label>
                                  <select
                                    className="border-line min-h-11 rounded-lg border-2 bg-white px-2 text-sm"
                                    disabled={c.skip}
                                    id={m.day + s + 'c'}
                                    onChange={(e) => setOverride(m.day, s, { carb: e.target.value as CarbId })}
                                    value={c.carb}
                                  >
                                    {CARBS.map((o) => <option key={o.id} value={o.id}>{o.id === 'roti' ? meal.roti : o.label}</option>)}
                                  </select>
                                  <button
                                    className="rounded-pill ml-auto min-h-11 px-3 text-sm font-bold text-green-700 underline-offset-4 hover:underline"
                                    onClick={() => setOverride(m.day, s, { skip: !c.skip })}
                                    type="button"
                                  >
                                    {c.skip ? 'Add back' : 'Skip'}
                                  </button>
                                </div>
                              </article>
                            )
                          })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-ink-600 mt-4 flex items-start gap-2 text-sm">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
              Calories and protein are kitchen estimates for one portion, not lab values.
            </p>
          </section>

          <Notice title="Cooking around a health need?">
            Tell us about allergies, diabetes or a diet your doctor gave you before you start. We cook to your notes, but our
            meals are not medical treatment and we can't promise any result.
          </Notice>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24" aria-labelledby="summary-heading">
          <div className="text-cream rounded-2xl bg-green-700 p-6 shadow-md">
            <h2 className="text-lg font-extrabold" id="summary-heading">Your plan</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-cream/75">Meals a week</dt><dd className="font-bold">{summary.meals.length * people}</dd></div>
              <div className="flex justify-between"><dt className="text-cream/75">Weekly</dt><dd className="font-bold">{inr(summary.weekly)}</dd></div>
              <div className="flex justify-between"><dt className="text-cream/75">× {weeks} week{weeks > 1 ? 's' : ''}</dt><dd className="font-bold">{inr(summary.gross)}</dd></div>
              {summary.off > 0 && (
                <div className="flex justify-between text-gold-400"><dt>{summary.off}% longer-plan saving</dt><dd className="font-bold">−{inr(summary.saved)}</dd></div>
              )}
            </dl>
            <div className="border-cream/20 mt-4 flex items-end justify-between border-t pt-4">
              <span className="text-cream/75 text-sm">Total</span>
              <span aria-live="polite" className="text-gold-400 text-3xl font-extrabold">{inr(summary.total)}</span>
            </div>
            <p className="text-cream/70 mt-1 text-right text-xs">
              {summary.meals.length ? inr(summary.total / (summary.meals.length * people * weeks)) + ' a meal · ' : ''}delivery included
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-green-800 p-3">
                <p className="text-cream/70 text-xs">Protein a day</p>
                <p className="text-lg font-extrabold">{Math.round(summary.perDayProtein)} g</p>
              </div>
              <div className="rounded-xl bg-green-800 p-3">
                <p className="text-cream/70 text-xs">Calories a day</p>
                <p className="text-lg font-extrabold">~{Math.round(summary.perDayKcal)}</p>
              </div>
            </div>

            <a
              className={cn(
                'rounded-pill text-button mt-6 inline-flex h-13 w-full items-center justify-center gap-2 font-bold transition-colors focus-visible:ring-[3px] focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:outline-none',
                summary.meals.length ? 'bg-gold-400 text-green-700 hover:bg-gold-500' : 'pointer-events-none bg-gold-400/40 text-green-700',
              )}
              aria-disabled={!summary.meals.length}
              href={ctaHref}
              rel="noopener noreferrer"
              target={whatsapp ? '_blank' : undefined}
            >
              <MessageCircle aria-hidden className="size-5" /> Message us this plan
            </a>
            <p className="text-cream/70 mt-3 text-center text-xs">
              Nothing is charged now. We reply to confirm your start date and address.
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}
