# Cash on Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in customer choose Cash on delivery at checkout, and let staff mark those orders collected or cancelled without unpaid cash counting as revenue.

**Architecture:** A cash order is written straight away by a new `POST /api/orders/cash` endpoint. It shares the cart, pincode and customer checks with `/create` through a helper extracted from `endpoints.ts`. Two new order fields, `paymentType` and `paymentState`, carry the method and the state. `paidAt` keeps meaning "money received": it is set at capture or at collection, so every existing money query on `paidAt` stays correct.

**Tech Stack:** Next.js (read `node_modules/next/dist/docs/` before touching routes or pages), Payload CMS with Postgres, zod, vitest (`pnpm run test:int`), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-28-cash-on-delivery-design.md`

## Global Constraints

- Amounts are stored in paise. Admin money inputs use `RupeeField` and `RupeeCell`.
- The prepaid flow (`createOrderEndpoint`, `verifyOrderEndpoint`, `recordPaidOrder`, the webhook) must behave exactly as before, and its existing tests must pass unchanged.
- No price, line or day count is ever read from the request body. Lines come from the cart cookie through `resolveCartLines`.
- Commit the regenerated `src/payload-types.ts` (and `src/app/(payload)/admin/importMap.js` when components are added) in the same commit as the schema change.
- UI follows `docs/design/design.md`: WCAG 2.2 AA, 44px targets, pill buttons, one primary action, `--gold-400` never used as text on light backgrounds.
- Customer-facing copy lives in the existing `copy.ts` files.
- Exact copy: cash note "Pay ₹X in cash at your first delivery." Order-placed and email line "Cash on delivery: ₹X due at your first delivery." Staff state labels: Online · Cash due · Collected · Cancelled.

## Review Focus

1. **A double-clicked "Place order"** must give one order. Pinned in Task 3 (`returns the same order for a repeated cashKey`).
2. **COD switched off, or the total over the limit, after the checkout page loaded** must be refused by the server with an "online payment instead" message. Pinned in Task 3.
3. **Staff clicking "Mark cash collected" twice, or collecting a cancelled order** must not move `paidAt` or reopen the order. Pinned in Task 4 (`refuses a second transition`).
4. **A customer calling collect or cancel on their own order** must get a 403. Pinned in Task 4.
5. **A cash order placed today but not collected** must count in "orders today" and in "Cash due", not in collected money. Pinned in Task 7.

---

### Task 1: Order fields, payment settings global, migration

**Files:**
- Modify: `src/collections/Orders/index.ts` (fields after `paidAt`; `admin.defaultColumns`; collection description)
- Create: `src/globals/PaymentSettings/config.ts`
- Modify: `src/payload.config.ts:197` (add `PaymentSettings` to `globals`)
- Create: `src/migrations/20261128_180000_cash_on_delivery.ts`; register it in `src/migrations/index.ts`
- Regenerate: `src/payload-types.ts`
- Test: `tests/int/cash-order-schema.int.spec.ts`

**Interfaces:**
- Produces: `Order.paymentType: 'online' | 'cash'`, `Order.paymentState: 'paid' | 'cashDue' | 'collected' | 'cancelled'`, `Order.collectedBy?: number | User`, `Order.cancelledAt?: string`, `Order.cashKey?: string`; global slug `payment-settings` with `codEnabled: boolean` and `codMaxTotal?: number` (paise).
- Produces: `src/utilities/paymentState.ts`, which exports `PAYMENT_STATE_LABELS: Record<Order['paymentState'], string>` with the values `{ paid: 'Online', cashDue: 'Cash due', collected: 'Collected', cancelled: 'Cancelled' }`.

- [ ] **Step 1: Write the failing test.** Use the payload pattern from `tests/int/order-endpoints.int.spec.ts` (with the `vi.setConfig` timeouts).
  - `defaults a new order to online and paid`: `payload.create` an order without the new fields, then expect `paymentType === 'online'` and `paymentState === 'paid'`.
  - `allows two orders with no gateway order id`: create two `cash`/`cashDue` orders with no gateway fields. Both succeed.
  - `refuses a duplicate cashKey`: a second create with the same `cashKey` throws.
  - `reads payment settings defaults`: `findGlobal('payment-settings')` gives `codEnabled === true` and `codMaxTotal` null.
- [ ] **Step 2: Run** `pnpm run test:int -- tests/int/cash-order-schema.int.spec.ts`. Expected: FAIL (unknown fields or global).
- [ ] **Step 3: Add the fields.**
  - Fields in the sidebar: `access.update: () => false` on `paymentType`, `paymentState`, `collectedBy`, `cancelledAt`, `cashKey`. The state changes only through Task 4's endpoints, which use `overrideAccess`.
  - `cashKey`: `unique: true, index: true, admin.hidden: true`.
  - Update the collection description: "One row per order. Online orders are written once payment is captured; cash orders are written at checkout and show as Cash due until staff mark them collected."
  - The global: group `Website`, `read: () => true`, `update: isStaff`, `codMaxTotal` through `RupeeField` as other money fields do, label "Cash on delivery".
- [ ] **Step 4: Write the migration.** Add the enums `enum_orders_payment_type` and `enum_orders_payment_state`, then the columns with defaults `'online'` and `'paid'`, NOT NULL (this backfills existing rows), `collected_by_id` FK to `users`, `cancelled_at`, and `cash_key` unique. Add the `payment_settings` table. Follow the guarded `DO $$` style of `20261101_150000_paid_orders_only.ts`. `down` drops all of it.
- [ ] **Step 5: Run** `pnpm run generate:types`, `pnpm run generate:importmap`, then the test. Expected: PASS.
- [ ] **Step 6: Commit** with message `Add cash-on-delivery order fields and payment settings`, including `src/payload-types.ts`.

### Task 2: Extract the shared checkout validation

**Files:**
- Create: `src/collections/Orders/checkout.ts`
- Modify: `src/collections/Orders/endpoints.ts:92-248` (`createOrderEndpoint` calls the helper)
- Test: existing `tests/int/order-endpoints.int.spec.ts` (unchanged) and new `tests/int/order-checkout.int.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  export type PreparedCheckout = {
    customer: Customer
    delivery: OrderIntent['delivery']   // already mapped to addressLine1/… names, note included
    items: OrderIntentItem[]
    total: number                       // paise
  }
  export const prepareCheckout = (
    req: PayloadRequest,
    bodySchema?: z.ZodTypeAny,          // defaults to orderCreateSchema
  ): Promise<{ ok: true; checkout: PreparedCheckout; body: unknown } | { ok: false; response: Response }>
  ```
  The helper runs, in this order: same-origin, signed-in customer, IP limit, body parse, pincode, cart cookie checks, `resolveCartLines`, items mapping. It does **not** check `isRazorpayConfigured`. `/create` checks that itself, right after `prepareCheckout`. The message constants move into `checkout.ts` and are exported.

- [ ] **Step 1: Write the failing test** `order-checkout.int.spec.ts`:
  - `refuses a signed-out request with 401`.
  - `refuses an unserved pincode with reason pincode-not-served`: with `delivery-areas.enforce` on, expect status 422 and JSON `reason === 'pincode-not-served'`.
  - `prices lines from the cookie`: for a known product, expect `checkout.total` to equal its live price.
- [ ] **Step 2: Run** it. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `prepareCheckout` by moving code out of `createOrderEndpoint`, which keeps its gateway, intent and response logic.
- [ ] **Step 4: Run** `pnpm run test:int -- tests/int/order-checkout.int.spec.ts tests/int/order-endpoints.int.spec.ts`. Expected: all PASS.
- [ ] **Step 5: Commit** with message `Share checkout validation between order endpoints`.

### Task 3: Cash order endpoint

**Files:**
- Create: `src/collections/Orders/cash.ts` (`recordCashOrder`, `cashOrderEndpoint`)
- Modify: `src/collections/Orders/schema.ts` (add `orderCashSchema`)
- Modify: `src/collections/Orders/index.ts` (register the endpoint)
- Test: `tests/int/order-cash.int.spec.ts`

**Interfaces:**
- Consumes: `prepareCheckout` (Task 2), the `payment-settings` global (Task 1), `sendOrderMails` (`mail.ts`), `clearCartCookie` (`@/utilities/cart`).
- Produces:
  - `orderCashSchema = orderCreateSchema.extend({ cashKey: z.string().uuid() })`.
  - `recordCashOrder(payload: Payload, checkout: PreparedCheckout, cashKey: string): Promise<{ order: Order; recorded: boolean }>`. It writes `paymentType: 'cash'`, `paymentState: 'cashDue'`, `subtotal = total = checkout.total`, with no `paidAt` and no gateway fields. On a unique violation it returns the existing order found by `cashKey` with `recorded: false`, matching the race handling in `confirm.ts`.
  - The endpoint at `path: '/cash'`, `POST`, answers 200 `{ orderId }` with `Set-Cookie: clearCartCookie()`. Mail is sent through `runAfterReply` only when `recorded`.
  - Refusals, both 422 with JSON `reason`:
    - COD off: `'cod-off'`, message "Cash on delivery isn't available right now. Please pay online to place your order."
    - Total over `codMaxTotal`: `'cod-limit'`, message "Cash on delivery is available for orders up to ₹X. Please pay online for this order."

- [ ] **Step 1: Write the failing tests.** Mock `sendOrderMails` as `order-endpoints.int.spec.ts` does.
  - `writes a cash-due order with no gateway fields`: expect `paymentType 'cash'`, `paymentState 'cashDue'`, `paidAt` null, `gatewayOrderId` null, `total` equal to the cart total, the cart cookie cleared, and `sendOrderMails` called once.
  - `returns the same order for a repeated cashKey`: two calls give the same `orderId`, one row has that `cashKey`, and mail is sent once.
  - `refuses when COD is off` → `reason 'cod-off'`, no row.
  - `refuses a total over the limit` → `reason 'cod-limit'`, no row.
  - `works when Razorpay is not configured`: `isRazorpayConfigured` mocked false, still 200.
  - `refuses a body without a valid cashKey` → 422.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** `cash.ts` and register `cashOrderEndpoint` next to `createOrderEndpoint`.
- [ ] **Step 4: Run** the new tests and `order-endpoints.int.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with message `Add cash on delivery order endpoint`.

### Task 4: Staff collect and cancel

**Files:**
- Create: `src/collections/Orders/cashActions.ts`
- Modify: `src/collections/Orders/index.ts` (register both endpoints)
- Test: `tests/int/order-cash-actions.int.spec.ts`

**Interfaces:**
- Consumes: `hasStaffRole` (`src/access/isStaff.ts`).
- Produces:
  - `transitionCashOrder(payload: Payload, id: number | string, to: 'collected' | 'cancelled', staffId: number): Promise<{ ok: true; order: Order } | { ok: false; status: 404 | 409 }>`.
  - It allows only `cash`/`cashDue` → `collected` (sets `paidAt` and `collectedBy`) or → `cancelled` (sets `cancelledAt`).
  - It is atomic: `payload.update` with `where: { id, paymentType: 'cash', paymentState: 'cashDue' }`, and zero docs updated means 409.
  - Endpoints `POST /:id/collect` and `POST /:id/cancel`: same-origin, `hasStaffRole(req.user)` or 403, answer `{ paymentState }`.

- [ ] **Step 1: Write the failing tests:**
  - `collects a cash-due order`: expect `paymentState 'collected'`, `paidAt` set, `collectedBy` equal to the staff id.
  - `cancels a cash-due order`: `cancelledAt` set, `paidAt` still null.
  - `refuses a second transition`: collect, then collect again gives 409 and `paidAt` unchanged. Cancel after collect gives 409.
  - `refuses an online order` → 409.
  - `refuses a customer or a signed-out request` → 403.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** `cashActions.ts` and register the endpoints.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** with message `Let staff mark cash orders collected or cancelled`.

### Task 5: Checkout choice

**Files:**
- Modify: `src/app/(frontend)/(site)/checkout/page.tsx` (read `payment-settings`, pass `cod: { enabled: boolean; maxTotal: number | null }`)
- Modify: `src/app/(frontend)/(site)/checkout/CheckoutForm.tsx`
- Modify: `src/app/(frontend)/(site)/checkout/copy.ts`
- Create: `src/utilities/cashCheckout.ts`
- Test: `tests/int/cash-checkout.int.spec.ts`, plus a Playwright case in the existing checkout e2e spec

**Interfaces:**
- Consumes: `/api/orders/cash` (Task 3).
- Produces:
  - `codOffered(cod: { enabled: boolean; maxTotal: number | null }, total: number): boolean`.
  - `readCashOrder(body: unknown): { orderId: number | string } | null`, the counterpart of `readCreatedOrder` in `src/utilities/orderCreate.ts`.

- [ ] **Step 1: Write the failing unit tests:**
  - `codOffered` is true when enabled with no limit, false when disabled, true at exactly the limit, and false one paisa over.
  - `readCashOrder` accepts `{ orderId: 12 }` and rejects `{}`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** the helpers, then the form.
  - A radio group labelled "How would you like to pay?" with **Pay online** (default) and **Cash on delivery**. It is rendered only when `codOffered`.
  - With cash chosen, show the cash note, set the button label to "Place order", and submit `{ delivery, note, cashKey }` to `/api/orders/cash`. `cashKey` comes from `crypto.randomUUID()` once per page load, kept in a ref.
  - On success, `router.push('/order-placed/' + orderId)`. On 422 with `reason 'pincode-not-served'`, open `PincodeNotServedDialog`. On any other 422, show the message inline and keep the form filled in.
- [ ] **Step 4: Run** the unit tests. Then add the e2e test `places a cash on delivery order`: choose cash, place the order, land on `/order-placed/…` showing the "due at your first delivery" line. Run `pnpm run test:e2e -- --grep "cash on delivery"`. Expected: PASS.
- [ ] **Step 5: Check visually** with the preview: the radio targets are at least 44px, keyboard focus is visible, and there is one primary button.
- [ ] **Step 6: Commit** with message `Offer cash on delivery at checkout`.

### Task 6: Order-placed page, emails, account history

**Files:**
- Modify: `src/app/(frontend)/(site)/order-placed/[id]/page.tsx`, `src/app/(frontend)/(site)/order-placed/copy.ts`
- Modify: `src/collections/Orders/mail.ts` (`sendOrderMails`), `src/email/templates/Order.tsx`
- Modify: `src/app/(frontend)/(site)/account/AccountPanels.tsx`
- Test: extend `tests/int/email-render.int.spec.ts` and `tests/int/order-summary.int.spec.tsx`

**Interfaces:**
- Consumes: `Order.paymentType` and `Order.paymentState` (Task 1).
- Produces: `Order.tsx` takes a new prop `payment: { kind: 'online'; paymentId: string } | { kind: 'cash'; state: Order['paymentState'] }`.

- [ ] **Step 1: Write the failing tests:**
  - `renders the cash line for a cash order`: the customer email contains "Cash on delivery: ₹1,500 due at your first delivery." and no payment id.
  - The staff email contains "Cash due".
  - An online order renders exactly as before (existing assertions).
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The order-placed page swaps its paid wording for the cash line when `paymentType === 'cash'`.
  - Account history shows "Cash due", "Paid in cash" or "Cancelled" for cash orders.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** with message `Show cash on delivery on the confirmation, emails and account`.

### Task 7: Admin list, order detail actions, dashboard and reports

**Files:**
- Modify: `src/collections/Orders/index.ts` (`defaultColumns` gains `paymentState`; `paymentType` and `paymentState` are filterable)
- Create: `src/components/Admin/OrderSummary/CashActions.tsx` (client: two buttons with confirm, calling Task 4's endpoints, then `router.refresh()`)
- Modify: `src/components/Admin/OrderSummary/OrderPaymentView.tsx` (for cash orders, show the state and `CashActions` while `cashDue`, and hide the Razorpay panel)
- Modify: `src/components/Admin/Widgets/OrdersToday.tsx` (count by `createdAt`, excluding `cancelled`; collected money stays on `paidAt`; add a Cash due figure)
- Modify: `src/collections/Orders/report.ts` (`loadOrderReport` also loads `cashDue` orders with `createdAt` in range), `src/utilities/orderReport/build.ts` (`OrderReport.cashDue: { count: number; total: number; orders: ReportRow[] }`), `src/utilities/orderReport/pdf.ts`, `src/utilities/orderReport/xlsx.ts`, `src/components/Admin/Reports/ReportsBody.tsx`
- Test: extend `tests/int/order-report.int.spec.ts`, and add `tests/int/orders-today.int.spec.ts`

**Interfaces:**
- Consumes: `transitionCashOrder` endpoints (Task 4), `PAYMENT_STATE_LABELS` (Task 1).
- Produces: `buildOrderReport` gains the input `cashDue: ReportOrder[]` and the output `cashDue`.

- [ ] **Step 1: Write the failing tests:**
  - `keeps cash due out of revenue and lists it apart`: a paid order of ₹1,000 and a cash-due order of ₹500 in range give `totals.revenue` 100000 and `cashDue` `{ count: 1, total: 50000 }`.
  - `counts collected cash on its collection day`.
  - `orders-today counts a cash order placed today`: count 1, collected ₹0, cash due ₹X.
  - The PDF and XLSX render a "Cash still due" section when `cashDue.count > 0`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement**, then run `pnpm run generate:importmap` for `CashActions`.
- [ ] **Step 4: Run** `pnpm run test:int`. Expected: the whole int suite passes.
- [ ] **Step 5: Check in the admin preview:**
  - A cash order shows Cash due.
  - Mark cash collected asks for confirmation, then shows Collected.
  - The dashboard figures update.
  - Light and dark themes are both legible.
- [ ] **Step 6: Commit** with message `Track cash orders in the admin, dashboard and reports`, including `importMap.js`.

## Self-review notes

- Spec coverage: data → T1, settings → T1, endpoint → T2/T3, transitions → T4, checkout UI → T5, confirmation/email/account → T6, admin/dashboard/reports → T7, tests → each task.
- Names are used consistently across tasks: `paymentType`, `paymentState`, `cashKey`, `prepareCheckout`, `recordCashOrder`, `transitionCashOrder`, `codOffered`, `readCashOrder`.
