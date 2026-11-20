'use client'

import { ArrowLeft, ArrowRight, Check, ChevronUp, Minus, Moon, Plus, ShoppingBag, Sparkles, Sun } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

import { Notice } from '@/components/Notice'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { formatPaise } from '@/utilities/money'
import type { PlanBuilderData, PlanSlot } from '@/utilities/planBuilder'
import { PLAN_MAX_PEOPLE, SLOT_LABEL } from '@/utilities/planBuilder'
import { cn } from '@/utilities/ui'
import { whatsappHref } from '@/utilities/whatsapp'

type Meal = 'lunch' | 'dinner'
const MEALS: Meal[] = ['lunch', 'dinner']
const MEAL_ICON = { dinner: Moon, lunch: Sun }
const MEAL_LABEL = { dinner: 'Dinner', lunch: 'Lunch' }

const STEPS = [
  { heading: 'Choose your plan', label: 'Plan' },
  { heading: 'See the menu', label: 'Menu' },
  { heading: 'Choose your options', label: 'Options' },
] as const

const focusRing =
  'focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:outline-none'

/** A large selectable card used for every choice in the builder. */
const ChoiceCard: React.FC<{
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

const FieldLabel: React.FC<{ children: React.ReactNode; hint?: string; id: string }> = ({ children, hint, id }) => (
  <div className="mb-3">
    <h3 className="text-ink-900 font-extrabold" id={id}>
      {children}
    </h3>
    {hint && <p className="text-ink-600 text-sm">{hint}</p>}
  </div>
)

export function PlanBuilder({
  data,
  notice,
  whatsapp,
}: {
  data: PlanBuilderData
  notice: null | string
  whatsapp: null | string
}) {
  const [step, setStep] = useState(0)
  const [meals, setMeals] = useState<Record<Meal, boolean>>({ dinner: true, lunch: true })
  const [planLabel, setPlanLabel] = useState(data.plans[Math.min(1, data.plans.length - 1)]?.label ?? '')
  const [people, setPeople] = useState(1)
  const [choices, setChoices] = useState<number[]>(data.optionGroups.map(() => 0))
  const [menuWeek, setMenuWeek] = useState<'next' | 'this'>('this')
  const [sheetOpen, setSheetOpen] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  // Move focus to the new step heading so keyboard and screen reader users land in the right place.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus()
  }, [step])

  const times = { dinner: data.dinnerTime, lunch: data.lunchTime }
  const slot: null | PlanSlot = meals.lunch && meals.dinner ? 'both' : meals.lunch ? 'lunch' : meals.dinner ? 'dinner' : null
  const plan = data.plans.find((p) => p.label === planLabel) ?? null
  const chosen = data.optionGroups.map((g, i) => g.choices[choices[i]] ?? g.choices[0])
  const valid = Boolean(slot && plan)

  const planPrice = slot && plan ? plan.prices[slot] : 0
  const extraPerDay = chosen.reduce((sum, c) => sum + c.extraPerDay, 0)
  const extrasTotal = plan ? extraPerDay * plan.days * people : 0
  const total = planPrice * people + extrasTotal

  const week = menuWeek === 'next' && data.nextWeek ? data.nextWeek : data.thisWeek
  const go = (n: number) => setStep(Math.max(0, Math.min(STEPS.length - 1, n)))

  if (!data.plans.length || !data.thisWeek) {
    return (
      <main className="bg-cream">
        <section className="container max-w-2xl py-20 text-center">
          <h1 className="text-ink-900 text-2xl font-extrabold">Plans open soon</h1>
          <p className="text-ink-600 mt-3">We are setting up this week&apos;s menu. Message us and we will help you start.</p>
          {whatsapp && (
            <a
              className={cn('rounded-pill mt-6 inline-flex h-13 items-center gap-2 bg-green-700 px-7 font-bold text-white hover:bg-green-600', focusRing)}
              href={whatsappHref(whatsapp)}
              rel="noopener noreferrer"
              target="_blank"
            >
              <WhatsAppIcon className="size-5" /> Message us on WhatsApp
            </a>
          )}
        </section>
      </main>
    )
  }

  const message = [
    'Hi UNAVE, I have a question about this plan:',
    `• ${slot ? SLOT_LABEL[slot] : 'No meals picked'}, ${plan?.label ?? ''}, ${people} ${people > 1 ? 'people' : 'person'}`,
    ...chosen.map((c, i) => `• ${data.optionGroups[i].title}: ${c.label}`),
  ].join('\n')

  /* ------------------------------------------------------------ pieces */

  const planRows = [
    { label: 'Meals', to: 0, value: slot ? SLOT_LABEL[slot] : 'None picked' },
    { label: 'Plan', to: 0, value: plan ? `${plan.label} · ${plan.days} days` : '—' },
    { label: 'People', to: 0, value: String(people) },
    ...chosen.map((c, i) => ({ label: data.optionGroups[i].title, to: 2, value: c.label })),
  ]

  const summary = (
    <>
      <dl className="space-y-2 text-sm">
        {planRows.map((r) => (
          <div className="flex items-baseline gap-3" key={r.label}>
            <dt className="text-cream/70 w-16 shrink-0">{r.label}</dt>
            <dd className="min-w-0 flex-1 font-bold">{r.value}</dd>
            <button
              className="text-gold-400 shrink-0 text-xs font-bold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:outline-none"
              onClick={() => {
                go(r.to)
                setSheetOpen(false)
              }}
              type="button"
            >
              Edit<span className="sr-only"> {r.label.toLowerCase()}</span>
            </button>
          </div>
        ))}
      </dl>
      <dl className="border-cream/15 mt-4 space-y-2 border-t pt-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-cream/75">
            {plan?.label ?? 'Plan'}
            {people > 1 ? ` × ${people}` : ''}
          </dt>
          <dd className="font-bold">{formatPaise(planPrice * people)}</dd>
        </div>
        {chosen
          .filter((c) => c.extraPerDay > 0)
          .map((c) => (
            <div className="flex justify-between gap-4" key={c.label}>
              <dt className="text-cream/75">
                {c.label} × {(plan?.days ?? 0) * people}
              </dt>
              <dd className="font-bold">{formatPaise(c.extraPerDay * (plan?.days ?? 0) * people)}</dd>
            </div>
          ))}
      </dl>
    </>
  )

  /** The form that puts the plan in the cart; the server prices it again from the admin. */
  const cartForm = (className?: string, compact = false) => (
    <form action="/api/cart/plan" className={className} method="post">
      <input name="slot" type="hidden" value={slot ?? ''} />
      <input name="plan" type="hidden" value={plan?.label ?? ''} />
      <input name="people" type="hidden" value={people} />
      {choices.map((c, i) => (
        <input key={i} name={`choice-${i}`} type="hidden" value={c} />
      ))}
      <button
        className={cn(
          'rounded-pill bg-gold-400 hover:bg-gold-500 inline-flex w-full items-center justify-center gap-2 font-bold text-green-700 transition-colors focus-visible:ring-[3px] focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-40 motion-reduce:transition-none',
          compact ? 'h-12 px-5 text-sm' : 'text-button h-13 px-6',
        )}
        disabled={!valid}
        type="submit"
      >
        <ShoppingBag aria-hidden className="size-5" /> Add plan to cart
      </button>
    </form>
  )

  /* ------------------------------------------------------------- steps */

  const planStep = (
    <div className="space-y-8">
      <div aria-labelledby="lbl-meals" role="group">
        <FieldLabel hint="Choose one or both. We deliver Monday to Saturday." id="lbl-meals">
          Which meals?
        </FieldLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          {MEALS.map((m) => {
            const Icon = MEAL_ICON[m]
            return (
              <ChoiceCard key={m} onClick={() => setMeals((c) => ({ ...c, [m]: !c[m] }))} role="checkbox" selected={meals[m]}>
                <Icon aria-hidden className="text-gold-600 size-6" />
                <span className="text-ink-900 mt-1 font-extrabold">{MEAL_LABEL[m]}</span>
                {times[m] && <span className="text-ink-600 text-sm">Delivered {times[m]}</span>}
              </ChoiceCard>
            )
          })}
        </div>
      </div>

      <div aria-labelledby="lbl-plan" role="radiogroup">
        <FieldLabel hint="Prices are for one person." id="lbl-plan">
          How long?
        </FieldLabel>
        <div className="grid gap-3 sm:grid-cols-3">
          {data.plans.map((p) => (
            <ChoiceCard key={p.label} onClick={() => setPlanLabel(p.label)} selected={planLabel === p.label}>
              <span className="text-ink-900 pr-8 font-extrabold">{p.label}</span>
              <span className="text-ink-600 text-sm">{p.days} delivery days</span>
              <span className="mt-1 text-lg font-extrabold text-green-700">
                {formatPaise(p.prices[slot ?? 'both'])}
              </span>
              {p.note && <span className="text-gold-600 text-sm font-bold">{p.note}</span>}
            </ChoiceCard>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel hint="Each person gets their own portion." id="lbl-people">
          How many people?
        </FieldLabel>
        <div aria-labelledby="lbl-people" className="border-line rounded-pill inline-flex items-center border-2 bg-white" role="group">
          <button
            aria-label="One fewer person"
            className={cn('grid size-12 place-items-center rounded-full hover:bg-green-50 disabled:opacity-40', focusRing)}
            disabled={people <= 1}
            onClick={() => setPeople((p) => p - 1)}
            type="button"
          >
            <Minus aria-hidden className="size-4" />
          </button>
          <span aria-live="polite" className="w-10 text-center text-lg font-extrabold">
            {people}
          </span>
          <button
            aria-label="One more person"
            className={cn('grid size-12 place-items-center rounded-full hover:bg-green-50 disabled:opacity-40', focusRing)}
            disabled={people >= PLAN_MAX_PEOPLE}
            onClick={() => setPeople((p) => p + 1)}
            type="button"
          >
            <Plus aria-hidden className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )

  const menuStep = (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-ink-600 max-w-[52ch]">One balanced meal for each slot, set by our kitchen. The menu changes every week.</p>
        {data.nextWeek && (
          <div aria-label="Menu week" className="border-line inline-flex gap-1 rounded-full border bg-green-50 p-1" role="tablist">
            {(['this', 'next'] as const).map((w) => {
              const info = w === 'this' ? data.thisWeek : data.nextWeek
              const on = menuWeek === w
              return (
                <button
                  aria-controls="menu-table"
                  aria-selected={on}
                  className={cn(
                    'rounded-pill flex min-h-11 flex-col items-center justify-center px-5 leading-tight transition-colors motion-reduce:transition-none',
                    on ? 'bg-green-700 text-white shadow-sm' : 'text-green-700 hover:bg-green-100',
                    focusRing,
                  )}
                  key={w}
                  onClick={() => setMenuWeek(w)}
                  role="tab"
                  type="button"
                >
                  <span className="text-sm font-extrabold">{w === 'this' ? 'This week' : 'Next week'}</span>
                  {info?.range && <span className={cn('text-xs', on ? 'text-cream/80' : 'text-ink-600')}>{info.range}</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>
      <div className="border-line mt-5 overflow-x-auto rounded-2xl border" id="menu-table" role={data.nextWeek ? 'tabpanel' : undefined}>
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <caption className="sr-only">Menu{week?.range ? ` for ${week.range}` : ''}</caption>
          <thead>
            <tr className="bg-green-100 text-green-700">
              <th className="w-20 px-4 py-3 font-extrabold" scope="col">
                Day
              </th>
              {MEALS.map((m) => {
                const Icon = MEAL_ICON[m]
                return (
                  <th className={cn('px-4 py-3', !meals[m] && 'opacity-50')} key={m} scope="col">
                    <span className="flex items-center gap-2 font-extrabold">
                      <Icon aria-hidden className="text-gold-600 size-4" /> {MEAL_LABEL[m]}
                    </span>
                    <span className="text-ink-600 block text-xs font-normal">{meals[m] ? times[m] : 'Not in your plan'}</span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-line divide-y bg-white">
            {week?.days.map((d) => (
              <tr className="align-top" key={d.day}>
                <th className="px-4 py-4 font-extrabold text-green-700" scope="row">
                  {d.day}
                </th>
                {MEALS.map((m) => {
                  const dish = d[m]
                  return (
                    <td className={cn('px-4 py-4', !meals[m] && 'opacity-50')} key={m}>
                      {dish ? (
                        <>
                          <p className="text-ink-900 font-extrabold">{dish.main}</p>
                          {dish.sides.length > 0 && <p className="text-ink-600 mt-1 text-xs leading-5">{dish.sides.join(' · ')}</p>}
                        </>
                      ) : (
                        <p className="text-ink-400 text-xs">To be announced</p>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const optionsStep = (
    <div className="space-y-8">
      {data.optionGroups.length === 0 && <p className="text-ink-600">No options to choose this week. Your plan is ready.</p>}
      {data.optionGroups.map((g, gi) => (
        <div aria-labelledby={`lbl-opt-${gi}`} key={g.title} role="radiogroup">
          <div className="mb-3 flex items-start gap-3">
            <span className="bg-gold-100 grid size-10 shrink-0 place-items-center rounded-xl">
              <Sparkles aria-hidden className="text-gold-600 size-5" />
            </span>
            <div>
              <h3 className="text-ink-900 font-extrabold" id={`lbl-opt-${gi}`}>
                {g.title}
              </h3>
              {g.hint && <p className="text-ink-600 text-sm">{g.hint}</p>}
            </div>
          </div>
          <div className={cn('grid gap-3', g.choices.length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
            {g.choices.map((c, ci) => (
              <ChoiceCard
                key={c.label}
                onClick={() => setChoices((prev) => prev.map((v, i) => (i === gi ? ci : v)))}
                selected={choices[gi] === ci}
              >
                <span className="text-ink-900 pr-8 font-extrabold">{c.label}</span>
                {c.detail && <span className="text-ink-600 text-sm">{c.detail}</span>}
                <span className={cn('mt-auto pt-1 text-sm font-bold', c.extraPerDay ? 'text-green-700' : 'text-ink-400')}>
                  {c.extraPerDay ? `+${formatPaise(c.extraPerDay)} a day` : 'Included'}
                </span>
              </ChoiceCard>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  const stepBody = [planStep, menuStep, optionsStep]

  /* -------------------------------------------------------------- page */

  return (
    <main className="bg-cream pb-28 lg:pb-0">
      <section className="bg-green-900 text-cream">
        <div className="container py-10 md:py-14">
          {data.copy.eyebrow && <p className="text-eyebrow text-gold-400 uppercase">{data.copy.eyebrow}</p>}
          {data.copy.heading && <h1 className="text-hero mt-3 max-w-[24ch] font-extrabold text-balance">{data.copy.heading}</h1>}
          {data.copy.intro && <p className="text-lead text-cream/85 mt-3 max-w-[56ch]">{data.copy.intro}</p>}
        </div>
      </section>

      <div className="container grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:py-12">
        <div className="min-w-0 space-y-8">
          {notice && (
            <p className="bg-gold-100 border-gold-300 text-ink-900 rounded-2xl border px-5 py-4 text-sm" role="alert">
              {notice}
            </p>
          )}

          <section aria-labelledby="step-heading" className="border-line rounded-3xl border bg-white p-5 shadow-sm sm:p-8">
            <nav aria-label="Steps">
              <ol className="grid grid-cols-3 gap-2">
                {STEPS.map((st, i) => {
                  const done = i < step
                  const current = i === step
                  return (
                    <li key={st.label}>
                      <button
                        aria-current={current ? 'step' : undefined}
                        className={cn('flex w-full flex-col gap-2 rounded-lg pt-1 text-left disabled:cursor-not-allowed', focusRing)}
                        disabled={i > step && !valid}
                        onClick={() => go(i)}
                        type="button"
                      >
                        <span
                          className={cn(
                            'h-1.5 w-full rounded-full transition-colors motion-reduce:transition-none',
                            done || current ? 'bg-green-700' : 'bg-line',
                          )}
                        />
                        <span
                          className={cn(
                            'flex items-center gap-1.5 text-sm font-bold',
                            current ? 'text-green-700' : done ? 'text-ink-900' : 'text-ink-400',
                          )}
                        >
                          {done ? <Check aria-hidden className="size-4 text-green-700" /> : <span>{i + 1}.</span>}
                          {st.label}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </nav>

            <h2 className="text-ink-900 mt-6 mb-6 text-2xl font-extrabold outline-none" id="step-heading" ref={headingRef} tabIndex={-1}>
              {STEPS[step].heading}
            </h2>
            {stepBody[step]}

            <div className="border-line mt-8 flex items-center justify-between gap-3 border-t pt-6">
              {step > 0 ? (
                <button
                  className={cn('rounded-pill inline-flex h-12 items-center gap-2 border-2 border-green-700 px-5 font-bold text-green-700 hover:bg-green-50', focusRing)}
                  onClick={() => go(step - 1)}
                  type="button"
                >
                  <ArrowLeft aria-hidden className="size-4" /> Back
                </button>
              ) : (
                <span />
              )}
              {step < STEPS.length - 1 ? (
                <div className="flex items-center gap-3">
                  {!valid && (
                    <p className="text-sm text-[#B3261E]" role="status">
                      Pick at least one meal.
                    </p>
                  )}
                  <button
                    className={cn('rounded-pill inline-flex h-12 items-center gap-2 bg-green-700 px-6 font-bold text-white hover:bg-green-600 disabled:opacity-40', focusRing)}
                    disabled={!valid}
                    onClick={() => go(step + 1)}
                    type="button"
                  >
                    Next: {STEPS[step + 1].label} <ArrowRight aria-hidden className="size-4" />
                  </button>
                </div>
              ) : (
                <p className="text-ink-600 text-sm">Your plan is ready. Add it to your cart from the summary.</p>
              )}
            </div>
          </section>

          {data.copy.noticeTitle && data.copy.noticeBody && <Notice title={data.copy.noticeTitle}>{data.copy.noticeBody}</Notice>}
        </div>

        {/* Desktop summary, live */}
        <aside aria-labelledby="summary-heading" className="hidden lg:sticky lg:top-24 lg:block">
          <div className="text-cream rounded-3xl bg-green-700 p-6 shadow-md">
            <h2 className="text-lg font-extrabold" id="summary-heading">
              Your plan
            </h2>
            <div className="mt-4">{summary}</div>
            <div className="border-cream/20 mt-4 flex items-end justify-between border-t pt-4">
              <span className="text-cream/75 text-sm">Total</span>
              <span aria-live="polite" className="text-gold-400 text-3xl font-extrabold">
                {formatPaise(total)}
              </span>
            </div>
            {cartForm('mt-6')}
            <p className="text-cream/70 mt-3 text-center text-xs">Pay securely at checkout. We call you to confirm your start date.</p>
            {whatsapp && (
              <a
                className="text-cream/90 mt-3 flex min-h-11 items-center justify-center gap-2 text-sm font-bold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:outline-none"
                href={whatsappHref(whatsapp, message)}
                rel="noopener noreferrer"
                target="_blank"
              >
                <WhatsAppIcon className="size-4" /> Ask us on WhatsApp first
              </a>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile sticky bar, live */}
      <div className="border-cream/10 text-cream fixed inset-x-0 bottom-0 z-40 max-h-[80vh] overflow-y-auto border-t bg-green-800 shadow-lg lg:hidden">
        {sheetOpen && (
          <div className="container border-cream/10 border-b py-4" id="mobile-summary">
            {summary}
            {whatsapp && (
              <a
                className="text-cream/90 mt-3 flex min-h-11 items-center gap-2 text-sm font-bold underline-offset-4 hover:underline"
                href={whatsappHref(whatsapp, message)}
                rel="noopener noreferrer"
                target="_blank"
              >
                <WhatsAppIcon className="size-4" /> Ask us on WhatsApp first
              </a>
            )}
          </div>
        )}
        <div className="container flex items-center gap-3 py-3">
          <button
            aria-controls="mobile-summary"
            aria-expanded={sheetOpen}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left focus-visible:ring-[3px] focus-visible:ring-gold-400 focus-visible:outline-none"
            onClick={() => setSheetOpen((o) => !o)}
            type="button"
          >
            <span className="min-w-0">
              <span className="text-cream/70 block text-xs">Total</span>
              <span aria-live="polite" className="text-gold-400 block text-xl font-extrabold">
                {formatPaise(total)}
              </span>
            </span>
            <ChevronUp aria-hidden className={cn('size-5 shrink-0 transition-transform motion-reduce:transition-none', !sheetOpen && 'rotate-180')} />
            <span className="sr-only">{sheetOpen ? 'Hide' : 'Show'} plan details</span>
          </button>
          {cartForm('shrink-0', true)}
        </div>
      </div>
    </main>
  )
}
