# Cash on delivery at checkout — design

Date: 2026-11-28 · Status: approved in conversation, awaiting doc review

## Intent

Let a signed-in customer place an order without paying online and pay the whole
amount in cash at the first delivery. Online payment through Razorpay stays
exactly as it is and stays the default. Staff need to see which cash orders are
still owed, mark them collected, and cancel ones refused at the door, without
unpaid orders inflating revenue.

## Goals

- A **Pay online / Cash on delivery** choice at checkout.
- A cash order is written immediately, after the same server checks as an online
  order (signed-in customer, server-priced cart from the cookie, served pincode).
- Staff can mark a cash order **collected** or **cancelled**.
- Money views (reports, exports, widgets) count only money actually received.
- Staff can switch COD off, and can cap it by order value.

## Non-goals

- Razorpay Magic Checkout or Razorpay's own COD. Nothing here blocks adopting it
  later.
- A COD fee (none for now).
- Instalments or per-day cash collection: the whole plan is paid at the first
  drop.
- Guest checkout. Checkout still requires a customer account, as it does today.

## Anti-goals

- Changing or risking the online-payment path. Prepaid orders keep the current
  intent → payment → `recordPaidOrder` flow untouched.
- Counting cash that hasn't been collected as revenue.
- A browser value deciding an amount, or the payment method of an existing order.
- Two orders from one double-clicked "Place order".

## Approaches considered

1. **Build COD in-house (chosen).** Save the order straight away with the cash
   payment method, skip the gateway. No dependency on Razorpay, no change to the
   prepaid flow, and it reuses the existing checks.
2. **Razorpay Magic Checkout COD.** Needs Razorpay to enable it, brings its own
   address step and expects promotions endpoints. That means reworking a
   checkout that already collects the address, food preference and pincode
   itself. Worth it only if Magic Checkout's other features are wanted.
3. **Record a cash order as a checkout intent until it's collected.** Rejected:
   intents expire and don't appear in the admin as orders, so the kitchen would
   not see the order.

## Design

### Data: the `orders` collection

New fields:

| Field | Type | Notes |
|---|---|---|
| `paymentType` | select `online` \| `cash`, required, default `online` | Not editable after create. Named `paymentType`, not `paymentMethod`, because the existing `payment.method` group already holds the Razorpay method (upi, card). |
| `paymentState` | select `paid` \| `cashDue` \| `collected` \| `cancelled`, required | Online orders are `paid`. Cash orders start as `cashDue`. |
| `collectedBy` | relationship → `users`, optional | Set when marked collected. |
| `cancelledAt` | date, optional | Set when cancelled. |
| `cashKey` | text, unique, optional | Stops a double submit creating two cash orders (see below). |

Changed fields:

- `gatewayOrderId`, `gatewayPaymentId`: stay unique, but are empty for cash
  orders. Postgres unique allows multiple NULLs. The Razorpay paths still always
  set them.
- `paidAt` keeps its meaning, **when the money was received**. It is set at
  capture for online orders and when marked collected for cash orders, and stays
  empty while cash is due. Every money view already filters and sorts on
  `paidAt`, so they stay correct with no query changes: cash still owed is
  absent, and collected cash counts on the day it was collected.

Migration: add the columns and enums, then backfill existing rows as
`paymentType = online` and `paymentState = paid`. Regenerate and commit
`src/payload-types.ts` in the same commit (the deploy build breaks without it).

State changes are allowed only through the two staff actions, never by general
field edits:

- `cashDue → collected`: sets `paidAt = now` and `collectedBy = staff user`.
- `cashDue → cancelled`: sets `cancelledAt = now`.

No other transition is allowed. Online orders never change state.

### Settings: COD switch

A new global, `payment-settings`, in the **Website** admin group, with:

- `codEnabled` (checkbox, default **on**)
- `codMaxTotal` (rupees through `RupeeField`, stored in paise, optional, empty
  means no limit)

### Server: `POST /api/orders/cash`

A new endpoint beside `/create`. The shared validation is extracted from
`createOrderEndpoint` into one helper so the two can't drift:

1. Same-origin check, then a signed-in customer (401 otherwise), then the
   per-IP rate limit.
2. Parse the body with the same schema as `/create`, plus a `cashKey`: a UUID
   the checkout page generates when it loads.
3. Read `payment-settings`. Refuse with 422 if COD is off, or if `cart.total`
   is over `codMaxTotal`, with a message that offers online payment instead.
4. The pincode check, then cart lines resolved from the cookie (the shared
   helper).
5. Create the order with `paymentType: cash`, `paymentState: cashDue`, no
   gateway fields, no `paidAt`, `cashKey`, and the same items/delivery/total
   snapshot as `recordPaidOrder`. If the unique `cashKey` refuses the insert,
   read the existing order and return it (the double-click case), sending no
   mail.
6. Clear the cart cookie the same way the online success path does, send the
   order mails, and return the order id.

It does not depend on Razorpay being configured, so COD works even if the
gateway is down. The `/create` response is unchanged.

### Customer UI

- `CheckoutForm.tsx`: a two-option radio group above the place-order button,
  **Pay online** (default) and **Cash on delivery**. Cash shows one line: "Pay
  ₹X in cash at your first delivery." It is hidden when COD is off or the total
  is over the limit. The page reads the settings on the server and passes a flag
  down. The button label follows the choice: "Pay ₹X" or "Place order".
  WCAG 2.2 AA, 44px targets, one primary action, per `docs/design/design.md`.
- When cash is chosen, submit to `/api/orders/cash` and go to
  `/order-placed/[id]`. On a 422, show the message and keep the form filled in.
  A pincode refusal opens the existing `PincodeNotServedDialog`.
- `order-placed/[id]` and the order email (`src/email/templates/Order.tsx`):
  for cash orders, replace the "paid" wording with "Cash on delivery: ₹X due at
  your first delivery." The staff copy of the email says "Cash due".
- Customer account order history shows "Cash due", "Paid in cash" or
  "Cancelled" for cash orders.

### Admin

- Order list: add a **Payment** column (Online · Cash due · Collected ·
  Cancelled) and filters on `paymentType` and `paymentState`.
- Order detail (`OrderSummary` / `OrderPayment` views): for cash orders, show
  the state, and **Mark cash collected** and **Cancel order** buttons while
  `cashDue`. Each asks for confirmation, then calls a staff-only endpoint
  (`POST /api/orders/:id/collect`, `POST /api/orders/:id/cancel`) that enforces
  the allowed transition on the server. The Razorpay panel is not shown for
  cash orders.
- Dashboard: `OrdersToday` counts orders **placed** today by `createdAt`,
  excluding cancelled. Its "collected" money stays on `paidAt`. Add a **Cash
  due** figure: the sum and count of `cashDue` orders.
- Reports body and the PDF/XLSX exports: the paid-in-range figures stay as they
  are, keyed on `paidAt`. Add a **Cash still due** line listing the `cashDue`
  orders placed in the range.

## Testing

Integration tests (`tests/int`):

- A cash order is created with the right snapshot and state, and has no gateway
  fields.
- Requests are refused when signed out, COD is off, the total is over the
  limit, the pincode isn't served, or the cart is empty or stale.
- A repeated `cashKey` returns the same order and only one order exists.
- collect and cancel transitions work, invalid ones are refused, and the
  endpoints are refused for non-staff.
- The report and widget totals exclude `cashDue` and include `collected` on
  the collection day.
- The migration backfill leaves existing orders `online` and `paid`.

The prepaid tests must keep passing unchanged.

## Calls I made (open to change)

- The whole plan is paid in cash at the first delivery, with no fee.
- COD is on by default with no limit.
- `paidAt` means "money received" for both methods, so the existing money
  queries need no change.
- "Orders today" counts by `createdAt`, so cash orders show up for the kitchen
  on the day they're placed.
- Cancel is a state change, not a delete, so the history stays.

## Left to the builder

- Exact copy wording, kept in the existing `copy.ts` files.
- How the shared create/validate helper is split out of `endpoints.ts`.
- Migration file name and ordering.
