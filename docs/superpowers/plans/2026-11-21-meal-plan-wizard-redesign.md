# Meal Plan Wizard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The meal plan page opens straight onto the builder and looks like cart, checkout and the product page.

**Architecture:** Restyle the existing `PlanBuilder` folder in place. The state hook (`usePlanBuilder.ts`), the step logic, the cart form fields and prices are untouched; only the presentational components change, and they switch to the shop's own pieces (`CheckoutSteps` look, option-tile look, `Cta` pills, cart-summary card).

**Tech Stack:** Next.js 16 app router, React 19 client component, Tailwind v4 tokens from `src/app/(frontend)/globals.css`, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-11-21-meal-plan-wizard-redesign-design.md`

## Global Constraints

- Design contract: `docs/design/design.md`. Pill-shaped buttons, one primary action per section, CTA verbs.
- Never use `--gold-400` (`text-gold-400`) as text on a light background; use `text-gold-600` or green.
- WCAG 2.2 AA, 44px minimum targets (`min-h-11`), `motion-reduce:` variants on every transition.
- No change to: `usePlanBuilder.ts` behaviour, the form posted to `/api/cart/plan` (fields `slot`, `plan`, `people`, `mealPlan`, `choice-<i>`), prices, the list page, `MealPlanCard`.
- Copy stays the builder's current copy unless a task names new copy.

## Review Focus

- A plan with no valid meal picked (both meals unticked): Next, later steps and Add to cart stay disabled, and "Pick at least one meal." shows. Pinned in Task 2.
- A lunch-only or dinner-only plan: the meal tile is fixed and cannot be unticked. Pinned in Task 3.
- A plan with no option groups: the Options step says "No options to choose this week. Your plan is ready." Pinned in Task 3.
- A plan with no prices or no menu: the "Plans open soon" empty state renders and the builder does not. Pinned in Task 1.
- A length not offered for the chosen meals: its tile reads "Not offered for these meals" and the total does not use it. Pinned in Task 3.

---

## File map

| File | Change |
|---|---|
| `src/app/(frontend)/(site)/meal-subscription/PlanBuilder/Hero.tsx` | Replace `PlanHero` with `PlanHeader` (breadcrumb + h1 + intro). `PlanEmpty` stays. |
| `.../PlanBuilder/StepNav.tsx` | `StepNav` in the `CheckoutSteps` look; `StepFooter` on `Cta` pills. |
| `.../PlanBuilder/ui.tsx` | `ChoiceCard` restyled as an option tile; `FieldLabel` unchanged. |
| `.../PlanBuilder/PlanStep.tsx`, `OptionsStep.tsx` | Tile content; people stepper in the shop stepper look. |
| `.../PlanBuilder/MenuStep.tsx` | Table in card + border styling. |
| `.../PlanBuilder/Summary.tsx` | Summary card and mobile bar in the cart-summary look. |
| `.../PlanBuilder/index.tsx` | Page shell: container, header, steps, two columns. |
| `tests/int/plan-builder.int.spec.tsx` | New: behaviour tests for the builder. |

Test harness for every task: `vi.mock('next/image')` to a plain `img` and `vi.mock('next/link')` to a plain `a` (copy the pattern from `tests/int/product-detail.int.spec.tsx`). Fixture `data: PlanBuilderData` with two lengths (`Week`, 6 days, prices `{ lunch: 150000, dinner: 160000, both: 300000 }`; `Month`, 24 days, prices `{ lunch: 600000, both: 1100000 }`), two option groups (`Carb`: Rice +0, Roti +2000/day; `Extra`: A +0, B +500, C +900), `meals: 'any'`, a one-day `thisWeek`, `title: 'Kids plan'`, `description: 'Tasty'`.

Run tests with: `npx vitest run --config ./vitest.config.mts tests/int/plan-builder.int.spec.tsx`

---

### Task 1: Page header instead of the hero

**Files:**
- Modify: `.../PlanBuilder/Hero.tsx`, `.../PlanBuilder/index.tsx`
- Test: `tests/int/plan-builder.int.spec.tsx`

**Interfaces:**
- Produces: `PlanHeader({ data }: { data: PlanBuilderData })` exported from `Hero.tsx`; `PlanHero` deleted.

- [ ] **Step 1: Write the failing tests**
  - `it('opens on the builder with no hero block')`: render `<PlanBuilder data={data} notice={null} whatsapp="919999999999" />`; expect `getByRole('heading', { level: 1, name: 'Build your Kids plan' })`; expect `queryByRole('link', { name: /Build your plan/ })` null; expect `queryByText('From, for one person')` null; expect the breadcrumb link `Meal plans` with `href="/meal-subscription"`; expect `getByText('Tasty')`.
  - `it('shows plans open soon when there are no prices')`: `{ ...data, plans: [] }` → `getByRole('heading', { name: 'Plans open soon' })`, and no `Build your Kids plan` heading.
- [ ] **Step 2: Run, expect FAIL** (no "Build your Kids plan" h1; hero link present).
- [ ] **Step 3: Implement `PlanHeader`.** Breadcrumb exactly as today's (`Meal plans › title`, `min-h-11` link), then the `StorePageHeader` markup from `src/components/Store/StorePage.tsx` with `heading={\`Build your ${data.title}\`}` and `intro={data.description || 'Choose your meals, see this week’s menu and pick your options.'}` (reuse `StorePageHeader` directly). In `index.tsx`, render inside `<main className="container max-w-6xl py-10 sm:py-14 pb-28 lg:pb-14">`: breadcrumb, header, then the steps and columns (Task 2 onward); remove `#builder` wrapper band and `PlanHero`.
- [ ] **Step 4: Run, expect PASS.** Also run `npx tsc --noEmit -p .` → no output.
- [ ] **Step 5: Commit** `git commit -m "Open the meal plan page on the builder, with a shop page header"`

### Task 2: Step strip and step buttons in the checkout look

**Files:**
- Modify: `.../PlanBuilder/StepNav.tsx`, `.../PlanBuilder/index.tsx`
- Test: `tests/int/plan-builder.int.spec.tsx`

**Interfaces:**
- Consumes: `StepNav({ go, step, valid })`, `StepFooter({ go, step, valid })` (props unchanged).

- [ ] **Step 1: Write the failing tests**
  - `it('marks the current step and locks later steps until a meal is picked')`: initial `getByRole('button', { name: /Plan/ })` has `aria-current="step"`; untick Lunch and Dinner tiles → `getByRole('button', { name: /Menu/ })` is disabled, Next (`/Next: Menu/`) is disabled, `getByText('Pick at least one meal.')` present, and `getByRole('button', { name: /Add plan to cart/ })` (first match) is disabled.
  - `it('moves focus to the step heading')`: click Next → `document.activeElement` is the h2 with text `See the menu`; finished Plan step shows a check and stays clickable back to step 0.
- [ ] **Step 2: Run, expect FAIL** on the new look only where assertions depend on it (current behaviour already passes most; if all pass, keep them as guards and continue).
- [ ] **Step 3: Restyle.** `StepNav`: the `CheckoutSteps` markup (`nav aria-label="Steps"`, `ol flex flex-wrap items-center gap-x-2 gap-y-2 text-sm`, dot `size-7`: done `bg-green-700 text-cream` + check, current `bg-gold-400 text-green-900`, later `bg-green-50 text-ink-600 ring-line ring-1`, connector `h-px w-6 sm:w-10`), but each step is a `button` (`min-h-11`, `disabled={i > step && !valid}`, `aria-current` on the current one). `StepFooter`: Back = `Cta` `variant="secondary"` button, Next = `Cta` `variant="primary"` button (`disabled` when invalid); check `src/components/Cta` for the button-rendering prop and use `CTA_BASE`/`CTA_VARIANTS` classes on a `<button>` if `Cta` only renders links. Step card: `bg-card rounded-2xl p-6 shadow-sm sm:p-8`; step strip sits above the two columns.
- [ ] **Step 4: Run, expect PASS**; `npx eslint "src/app/(frontend)/(site)/meal-subscription"` → no errors.
- [ ] **Step 5: Commit** `git commit -m "Give the meal plan steps the checkout step strip and pill buttons"`

### Task 3: Choices as option tiles, people as the shop stepper

**Files:**
- Modify: `.../PlanBuilder/ui.tsx`, `PlanStep.tsx`, `OptionsStep.tsx`
- Test: `tests/int/plan-builder.int.spec.tsx`

**Interfaces:**
- Consumes: `ChoiceCard({ children, onClick, role?, selected })` (props unchanged, still a `button` with `role` and `aria-checked`).

- [ ] **Step 1: Write the failing tests**
  - `it('fixes the meal on a lunch-only plan')`: `meals: 'lunch'` → one `checkbox` Lunch, `aria-checked="true"`; clicking it keeps `aria-checked="true"`; no Dinner checkbox.
  - `it('prices only lengths offered for the chosen meals')`: untick Lunch (Dinner only) → Month tile contains `Not offered for these meals`; choose Month → Add to cart disabled.
  - `it('totals options per day per person')`: choose Week, people 2 (click `One more person`), step to Options, choose Roti and C → the summary total reads `formatPaise(300000*2 + (2000+900)*6*2)`.
  - `it('says when there are no options')`: `optionGroups: []` → on Options step `getByText('No options to choose this week. Your plan is ready.')`.
- [ ] **Step 2: Run, expect FAIL** only on markup the restyle changes; behaviour assertions guard the restyle.
- [ ] **Step 3: Restyle.** `ChoiceCard` gets the option-tile look from `src/components/Store/OptionTiles.tsx` driven by `selected` instead of `peer-checked`: unselected `border-2 border-green-700 bg-white text-green-900 rounded-2xl`, selected `bg-green-700 text-white shadow-md` with prices switching to `text-gold-300` and the gold check (`TileCheck` look) shown; `min-h-12`, `whitespace-normal` so details wrap; hover lift with `motion-reduce`. Keep the check badge for checkbox tiles square, radio round. The people control uses the `QuantityStepper` look (`border-line rounded-pill border-2 bg-white`, buttons `size-11`), keeping `aria-label="One fewer person"` / `"One more person"` and the `PLAN_MAX_PEOPLE` cap.
- [ ] **Step 4: Run, expect PASS**; tsc and eslint clean.
- [ ] **Step 5: Commit** `git commit -m "Show meal plan choices as the shop's option tiles"`

### Task 4: Menu table and summary in the shop look

**Files:**
- Modify: `.../PlanBuilder/MenuStep.tsx`, `Summary.tsx`
- Test: `tests/int/plan-builder.int.spec.tsx`

**Interfaces:**
- Consumes: `PlanSummary`, `CartForm`, `SummaryAside`, `MobileSummaryBar` (props unchanged).

- [ ] **Step 1: Write the failing tests**
  - `it('posts the same cart form')`: after choosing Week, 2 people, Roti → the first `form[action="/api/cart/plan"]` has hidden inputs `slot=both`, `plan=Week`, `people=2`, `mealPlan=kids`, `choice-0=1`, `choice-1=0`.
  - `it('edits a summary row back to its step')`: on Options step, click `Edit meals` (sr-only label) → h2 reads `Choose your plan`.
  - `it('keeps the WhatsApp ask with the plan in the message')`: the `Ask us on WhatsApp first` link `href` contains `wa.me/919999999999` and the encoded `Kids plan`.
- [ ] **Step 2: Run, expect PASS or FAIL**; these are guards for the restyle.
- [ ] **Step 3: Restyle.** `SummaryAside`: cart summary card (`bg-card rounded-2xl p-6 shadow-sm sm:p-7 lg:sticky lg:top-28`), `h2 text-lg font-bold text-green-900` "Your plan", the rows, a total row as the cart's (`border-line border-t pt-4`, label `text-base font-bold`, amount `text-[28px] leading-none font-extrabold text-green-900`), Add to cart as the primary `Cta` look full width, the secure line with `ShieldCheck` like the cart, then the WhatsApp link. Drop the green image header. `MobileSummaryBar`: white bar (`bg-card border-line border-t shadow-lg`), total in `text-green-900`, primary pill; Edit links green, no `text-gold-400` on light. `MenuStep`: table inside `border-line overflow-x-auto rounded-2xl border bg-white`, header row `bg-green-50 text-green-900`.
- [ ] **Step 4: Run all plan-builder tests, then `runInt`-equivalent full suite** `npx vitest run --config ./vitest.config.mts`; expect the same failures as before this work (product-detail combo notice, and the 9 database suites timing out), nothing new.
- [ ] **Step 5: Commit** `git commit -m "Match the meal plan summary and menu to the cart's look"`

### Task 5: Check it in the browser

- [ ] Run `pnpm build` → exits 0.
- [ ] Run the dev server and open `/meal-subscription/<a real slug>` at 390px and 1280px wide; check the five Review Focus cases by hand, keyboard-only tab through all three steps, and `prefers-reduced-motion` with no movement. Screenshot both widths for the user.
