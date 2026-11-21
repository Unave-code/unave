# Admin Order Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin order page's read-only inputs with a plain, receipt-like summary that reads every line kind (single item, size, combo, meal plan, built subscription with options, add-ons and trials) and shows the customer, delivery, payment and requests.

**Architecture:** A server `ui` field (`OrderSummary`) at the top of the Orders edit form loads the order, its customer, its `order-requests` and any meal plans its subscription lines name, then hands plain props to a presentational view. Line interpretation is a pure, unit-tested module. The snapshot fields are taken out of the form with `admin.condition: () => false`, so the list view keeps its columns and `startsOn` stays the one editable field in the sidebar.

**Tech Stack:** Payload 3.92 admin (server components, `@payloadcms/ui` root imports), React 19, SCSS against Payload theme variables, Vitest + Testing Library in jsdom.

**Spec:** `docs/superpowers/specs/2026-11-21-admin-order-detail-design.md`

## Global Constraints

- No schema change, no migration; `payload-types.ts` must not change (a `ui` field stores nothing). If it does change, commit it with the work.
- Money only through `formatPaise` (`src/utilities/money.ts`); amounts are paise.
- Never `--gold-400` as text on light backgrounds; status pills: New in gold (`--theme-warning-*` scale), Handled and Paid in green (`--theme-success-*`).
- Admin radii come from `--style-radius-s/m/l` (6/10/16px); colours from Payload theme variables so light and dark both work.
- WCAG 2.2 AA; links and copy buttons have a 44px minimum target; any transition is off under `prefers-reduced-motion`.
- Payload UI imports from the `@payloadcms/ui` root only, never subpaths.
- Dates and times shown in IST (`Asia/Kolkata`), the kitchen's day.
- Food preference shown by its label from `FOOD_PREFERENCE_LABELS`, never the raw value.

## Review Focus

- A subscription whose meal plan was deleted or renamed: picks show as one plain "Choices" list, never throw. (Task 1 test `falls back to a plain list when a pick no longer matches`.)
- A pick label that appears in two groups of the same plan (e.g. "Detox juice" in two groups): it is placed in the first group that has it and not repeated. (Task 1 test `places a pick once, in the first group that offers it`.)
- A pre-trial or hand-edited label with fewer than three `·` parts: shown whole as the line's detail. (Task 1 test `shows a label that does not split as it is`.)
- An order whose customer record was deleted: the Customer card says "Customer record not found" and the rest renders. (Task 2 test `renders when the customer is missing`.)
- Saving `startsOn` must not wipe the hidden snapshot fields. (Task 3 Step 4, checked against the dev database.)

---

### Task 1: Order line interpretation

**Files:**
- Create: `src/utilities/orderLines.ts`
- Test: `tests/int/order-lines.int.spec.ts`

**Interfaces:**
- Consumes: `isOneTimeOrderItem`, `orderComponentsLabel` from `src/utilities/orderDisplay.ts`; `ONE_TIME_DURATION` from `src/utilities/cart.ts`.
- Produces:
  ```ts
  export type OrderItemLike = NonNullable<Order['items']>[number]
  export type PlanGroups = { title: string; choices: string[] }[]
  export type PlanLookup = { groups: PlanGroups; trialLengths: string[] }
  export type OrderLineView =
    | { kind: 'item'; title: string; qty: number; unitPrice: number; lineTotal: number; size: string | null; productId: number | null }
    | { kind: 'combo'; title: string; qty: number; unitPrice: number; lineTotal: number; includes: string[]; productId: number | null }
    | { kind: 'plan'; title: string; duration: string; days: number; lineTotal: number; perDay: number; productId: number | null }
    | { kind: 'subscription'; title: string; meal: string; length: string; days: number; people: string; trial: boolean;
        groups: { title: string; picks: string[] }[] | null; picks: string[]; lineTotal: number; perDay: number }
    | { kind: 'unknown'; title: string; detail: string; lineTotal: number }
  export const MEAL_PLAN_TITLE_PREFIX = 'Meal plan: '
  export function mealPlanTitle(productTitle: string | null | undefined): string | null
  export function parseSubscriptionLabel(label: string): { meal: string; length: string; people: string; picks: string[] } | null
  export function groupPicks(picks: string[], groups: PlanGroups): { title: string; picks: string[] }[] | null
  export function describeOrderLine(item: OrderItemLike, lookup?: PlanLookup | null): OrderLineView
  export function orderKindSummary(lines: OrderLineView[]): string
  ```

Rules the tests pin:
- A line is a **subscription** when `product` is empty, `productTitle` starts with `Meal plan: `, and the label splits on ` · ` into at least three parts. If it starts with the prefix but does not split, it is `unknown` with the whole label as `detail`.
- **combo**: has components. **item**: `isOneTimeOrderItem`; `size` is the label unless it is `one-time`. **plan**: anything else with a product and days > 0.
- `perDay = Math.round(lineTotal / days)`; `lineTotal = unitPrice * qty` (qty defaults to 1).
- `trial` is true when the length is in `lookup.trialLengths` (case-insensitive) or, with no lookup, when it matches `/trial/i`.
- `groupPicks` returns `null` when any pick matches no group; otherwise groups in plan order, each group only if it has picks.
- `orderKindSummary` counts by kind with these nouns, in this order, joined by ` · `: subscription(s), meal plan(s), combo(s), single item(s); `unknown` counts as item(s).

- [ ] **Step 1: Write the failing tests** in `tests/int/order-lines.int.spec.ts`, using the seeded labels:
  ```ts
  const sub = { product: null, productTitle: 'Meal plan: High Protein Meals', days: 6, qty: 1, unitPrice: 736800,
    durationLabel: 'Lunch and dinner · 1 week · 2 people · Quinoa · Medium · Extra paneer · Boiled eggs · Buttermilk · Fruit bowl' }
  const lookup = { trialLengths: ['3-day trial'], groups: [
    { title: 'Base', choices: ['Multigrain roti', 'Brown rice', 'Quinoa'] },
    { title: 'Spice level', choices: ['Mild', 'Medium', 'Spicy'] },
    { title: 'Protein add-ons', choices: ['Extra paneer', 'Boiled eggs', 'Sprouts bowl'] },
    { title: 'Drinks and sides', choices: ['Buttermilk', 'Detox juice', 'Fruit bowl'] } ] }
  ```
  - `reads a built subscription into its parts`: kind `subscription`, meal `Lunch and dinner`, length `1 week`, people `2 people`, perDay `122800`, trial false, groups equal `[{Base:[Quinoa]},{Spice level:[Medium]},{Protein add-ons:[Extra paneer, Boiled eggs]},{Drinks and sides:[Buttermilk, Fruit bowl]}]` (as `{title, picks}`).
  - `marks the trial length`: label `Dinner · 3-day trial · 1 person · Brown rice · Mild · Sprouts bowl`, days 3 → trial true, with lookup and without.
  - `reads a subscription with no picks`: `Dinner · 2 weeks · 1 person` → picks `[]`, groups `[]` with an empty-groups lookup.
  - `falls back to a plain list when a pick no longer matches`: replace `Quinoa` with `Millet` → groups `null`, picks still listed.
  - `places a pick once, in the first group that offers it`: groups `[{A:[X]},{B:[X,Y]}]`, picks `[X,Y]` → `[{A:[X]},{B:[Y]}]`.
  - `shows a label that does not split as it is`: `Meal plan: Old` with label `Weekly` → kind `unknown`, detail `Weekly`.
  - `reads single items, sizes, combos and meal plan products`: `one-time` qty 2 unit 14900 → item, size null, lineTotal 29800; `1 kg` days 0 → item, size `1 kg`; components of two → combo with `includes` the two titles; product 5, `2 weeks`, days 12, unit 283900 → plan, perDay 23658.
  - `summarises the kinds`: two subscriptions + one item → `2 subscriptions · 1 single item`.

- [ ] **Step 2: Run to see them fail**
  Run: `pnpm vitest run --config ./vitest.config.mts tests/int/order-lines.int.spec.ts`
  Expected: FAIL, cannot resolve `@/utilities/orderLines`.

- [ ] **Step 3: Implement `src/utilities/orderLines.ts`** with the signatures above. `groupPicks` walks picks in order and assigns each to the first group whose choices include it (exact label match), marking used so a later group cannot claim it again.

- [ ] **Step 4: Run to see them pass** (same command). Expected: all pass.

- [ ] **Step 5: Commit**
  `git add src/utilities/orderLines.ts tests/int/order-lines.int.spec.ts`, message `Read every order line kind for the admin order page`.

### Task 2: Order summary view

**Files:**
- Create: `src/components/Admin/OrderSummary/OrderSummaryView.tsx` (presentational, no data access)
- Create: `src/components/Admin/OrderSummary/CopyValue.tsx` (`'use client'`, a value with a copy button)
- Create: `src/components/Admin/OrderSummary/OrderSummary.scss`
- Test: `tests/int/order-summary.int.spec.tsx`

**Interfaces:**
- Consumes: `OrderLineView`, `orderKindSummary` (Task 1); `formatPaise`; `FOOD_PREFERENCE_LABELS`.
- Produces:
  ```ts
  export type OrderSummaryProps = {
    order: Pick<Order, 'id' | 'createdAt' | 'updatedAt' | 'paidAt' | 'subtotal' | 'total' | 'gatewayOrderId' | 'gatewayPaymentId' | 'delivery'>
    customer: { id: number; name: string | null; email: string; phone: string | null } | null
    lines: OrderLineView[]
    requests: Pick<OrderRequest, 'id' | 'type' | 'status' | 'pauseFrom' | 'pauseTo' | 'reason' | 'staffNote' | 'createdAt'>[]
  }
  export function OrderSummaryView(props: OrderSummaryProps): React.JSX.Element
  export function CopyValue(props: { label: string; value: string }): React.JSX.Element
  ```

Layout (BEM root `.order-summary`, every section a `card`-class panel with an `h3`):
1. Header: "Order {id}", green **Paid** pill, "Paid {date, time IST}", total at large size, `orderKindSummary` line.
2. Two columns from 1000px, one below: left **Items**; right **Customer**, **Delivery**, **Payment**.
3. Full width **Requests**, then **Record** (created, updated).
- Items: one block per line. Kind tag text: Single item, Combo, Meal plan, Subscription (plus a **Trial** tag). Subscription rows are a `<dl>`: Meal, Length ("{length} · {days} days"), People, then each group title with its picks joined by ` · `, or a single "Choices" row when `groups` is null; "No add-ons" when there are no picks. Item rows: "{qty} × {unit} = {lineTotal}" when qty > 1. Plan and subscription show "{perDay} a day". Product lines link to `/admin/collections/products/{id}`. Footer: Subtotal, Total.
- Customer: name, email as `mailto:`, phone as `tel:`, "Open customer" link to `/admin/collections/customers/{id}`; missing → "Customer record not found".
- Delivery: name, phone (`tel:`), address lines, "{city}, {state} {pincode}", food preference label, note in a gold-tinted box headed "Customer note" when present.
- Payment: `CopyValue` for Razorpay order id and payment id; paid at.
- Requests: newest first; "Cancellation" or "Pause", status pill, "Pause {from} to {to}" for pauses, reason, "Kitchen note: …" when set, link to `/admin/collections/order-requests/{id}`; none → "No requests on this order."

- [ ] **Step 1: Write the failing tests** in `tests/int/order-summary.int.spec.tsx` rendering `OrderSummaryView` with fixtures built from the Task 1 subscription and a one-time item:
  - `leads with the order number, the paid pill and the total`: text "Order 360", "Paid", "₹7,368".
  - `groups a subscription's picks under their titles`: a row "Protein add-ons" with "Extra paneer · Boiled eggs".
  - `tags a trial`: a trial line renders the text "Trial".
  - `shows the customer's note and food preference label`: "No onion or garlic, please." and "Vegetarian" (raw `vegetarian` absent).
  - `lists requests with their status`: a pause request shows "Pause", "New" and its reason; with `requests: []` the text "No requests on this order."
  - `renders when the customer is missing`: `customer: null` → "Customer record not found".
  - `renders no form inputs`: `container.querySelectorAll('input, textarea, select').length === 0`.

- [ ] **Step 2: Run to see them fail**
  Run: `pnpm vitest run --config ./vitest.config.mts tests/int/order-summary.int.spec.tsx`
  Expected: FAIL, cannot resolve the view.

- [ ] **Step 3: Implement the view, `CopyValue` and the stylesheet.** `CopyValue` uses `navigator.clipboard.writeText` and announces "Copied" through an `aria-live="polite"` span; the value stays selectable text so it works without the button. Styles follow `ComboHealth.scss`: Payload theme variables only, `tabular-nums` on money.

- [ ] **Step 4: Run to see them pass** (same command). Expected: all pass.

- [ ] **Step 5: Commit**
  `git add src/components/Admin/OrderSummary tests/int/order-summary.int.spec.tsx`, message `Add the admin order summary view`.

### Task 3: Wire the summary into the Orders edit view

**Files:**
- Create: `src/components/Admin/OrderSummary/index.tsx` (server component)
- Modify: `src/collections/Orders/index.ts` (add the `summary` ui field after `paymentMode`; add `admin.condition: () => false` to `customer`, `items`, `delivery`, `subtotal`, `total`, `gatewayOrderId`, `gatewayPaymentId`, `paidAt`)
- Modify: `src/app/(payload)/admin/importMap.js` (regenerated)

**Interfaces:**
- Consumes: `OrderSummaryView` (Task 2); `describeOrderLine`, `mealPlanTitle`, `PlanLookup` (Task 1); `normalizeMealPlan` from `src/utilities/planBuilder.ts`.
- Produces: `export const OrderSummary: React.FC<UIFieldServerProps>`, registered as `'@/components/Admin/OrderSummary#OrderSummary'`.

- [ ] **Step 1: Implement `OrderSummary`.** Read `id` and `payload` from props; with no `id` (create view) render nothing. Load with `overrideAccess: true`, `depth: 0`, in parallel: the order (`findByID`), the customer (`select` name, email, phone; a missing record resolves to `null`, never throws), `order-requests` where `order` equals the id sorted `-createdAt`, and `meal-plans` whose `title` is in the set of `mealPlanTitle`s from the lines (depth 1). Build a `PlanLookup` per title from `normalizeMealPlan`: `groups` from `optionGroups` (choice labels), `trialLengths` from plans with `trial`. Map each item through `describeOrderLine` with its plan's lookup, then render `OrderSummaryView`.

- [ ] **Step 2: Register the field and hide the snapshot fields** in `src/collections/Orders/index.ts`: `{ name: 'summary', type: 'ui', admin: { components: { Field: '@/components/Admin/OrderSummary#OrderSummary' } } }` directly after `paymentMode`; the eight conditions listed above. Keep `defaultColumns` as it is.

- [ ] **Step 3: Regenerate and check types**
  Run: `pnpm generate:importmap`, then `pnpm generate:types` and `git diff --stat src/payload-types.ts`
  Expected: importMap gains the OrderSummary entry; payload-types shows no change. Then `npx tsc --noEmit`: no errors.

- [ ] **Step 4: Check it in the admin** against the seeded dev data. Start `pnpm dev`, sign in as a staff user and open order 360 (subscription with grouped picks), 361 (trial plus a no-pick subscription), 352 (combo), 351 (sized item) and 354 (pause request). Expected: every section renders with no read-only inputs. Set **Deliveries start on** on 360, save and reload: the date sticks, and the Items card is unchanged (snapshot not wiped). The Orders list still shows Customer, Total and Created. Screenshot light and dark.

- [ ] **Step 5: Run the whole integration suite**
  Run: `pnpm test:int`
  Expected: all pass.

- [ ] **Step 6: Commit**
  `git add src/components/Admin/OrderSummary/index.tsx src/collections/Orders/index.ts "src/app/(payload)/admin/importMap.js"` (plus `src/payload-types.ts` if it changed), message `Show the admin order page as a plain order summary`.

### Task 4: Commit the seeds and the docs

**Files:**
- Already modified: `src/scripts/seed-orders.ts`, `src/scripts/seed-catalogue.ts`, `package.json`, `docs/superpowers/specs/2026-11-21-admin-order-detail-design.md`, this plan.
- Modify: `docs/design/design.md` §6.16, one sentence: the order page opens on a plain summary (items by kind, customer, delivery, payment, requests) and the start date is the one editable field.

- [ ] **Step 1: Add the design.md sentence.**
- [ ] **Step 2: Commit**, message `Seed every order kind in dev and document the order page`.
