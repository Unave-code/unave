# Admin order detail page — design

Date: 2026-11-21 · Status: awaiting approval

## Intent

Staff open an order in the admin (`/admin/collections/orders/<id>`) and should see everything about it at a glance, whatever was bought: single items (with sizes and quantities), combos and their contents, meal plan products, and built meal subscriptions (meal, length, people, add-ons, trials). Today the page is Payload's default form: a flat array of read-only inputs, the customer shown as an id, and no sight of the customer's pause or cancellation requests.

## Goals

- Everything reads as plain text in cards, the way a receipt reads. No form inputs, no greyed-out read-only boxes.
- One readable summary of the order: who, what, where, how much, paid how, and what has been asked about it.
- Every line kind reads as itself, not as a generic array row.
- `Deliveries start on` stays the one editable field and keeps working through Payload's own Save.

## Non-goals

- No schema change and no migration. Every value shown is already stored on the order, the customer, or `order-requests`.
- No change to the Orders list view, the customer-facing pages, or the order emails.
- No new order status or fulfilment workflow.

## Anti-goals

- Rewriting Payload's edit view or its components (AGENTS.md: restyle by variables and unlayered rules, never by rewriting components).
- Any edit path for the snapshot fields. The order is a receipt.

## Approaches

- **A. Summary panel inside the existing edit view (picked).** A server `ui` field at the top of the form renders the summary; the raw snapshot fields are hidden from the form. Payload keeps the frame, Save, sidebar and the start-date picker. Picked because it shows data the order row does not hold (customer, requests) without rebuilding Payload's document view.
- B. Replace the default edit view with a custom document view. Full layout control, but Save, breadcrumbs and tabs must be rebuilt and it breaks on upgrades.
- C. Restyle the default fields only. Cheap, but cannot show the customer, the requests, or the subscription breakdown.

## Design

A new server component `src/components/Admin/OrderSummary` (with its own `.scss`), registered as a `ui` field at the top of `Orders.fields`, replacing nothing else. It reads the order by the document id through the Local API, plus the customer and the order's `order-requests`, and renders on Payload's `card` surfaces so `custom.scss` themes it in light and dark.

Sections, top to bottom:

1. **Header strip** — order number, **Paid** pill, paid date and time (IST), total, and a one-line kind summary (for example "1 subscription · 2 single items"). The payment-mode banner stays above it.
2. **Customer** — name, email (mailto), account phone, link to the customer record.
3. **Items** — one card per line, labelled by kind:
   - *Single item*: title, size if any, `qty × unit price = line total`.
   - *Combo*: title, quantity and price, and an "Includes" list of the component titles.
   - *Meal plan* (a product sold by duration): title, duration label, days, price and per-day rate.
   - *Meal subscription* (built in the plan builder; the line has no product and its label is `meal · length · people · picks…`): title, then labelled rows for Meal, Length (with days, and a **Trial** tag when the length is the 3-day trial), People, then the picks grouped under their option group titles (for example Base: Quinoa; Spice level: Medium; Protein add-ons: Extra paneer, Boiled eggs), price and per-day rate. The groups come from looking up the meal plan by the title in the line ("Meal plan: <title>") and matching each pick to a choice label; when the plan is gone or a pick no longer matches, the picks show as one plain "Choices" list instead. A label that does not split into at least three parts is shown whole.
   - Each line with a product links to the product record.
   - Footer: subtotal and total; these always match today, but both are shown since both are stored.
4. **Delivery** — name, phone (tel link), the address as lines, food preference (label, not raw value), and the customer's note, highlighted when present.
5. **Payment** — Razorpay order id and payment id (each copyable), paid at; the signature stays hidden.
6. **Requests** — every `order-requests` row for this order, newest first: kind, status pill (New in gold, Handled in green), pause dates, reason and the kitchen note, each linking to the request. "No requests" when none.
7. **Record** — created and last updated times.

Field changes in `src/collections/Orders/index.ts`: `customer`, `items`, `delivery`, `subtotal`, `total`, `gatewayOrderId`, `gatewayPaymentId` and `paidAt` get `admin.hidden` in the edit form; the list view's columns are unaffected because `defaultColumns` still names them and Payload keeps hidden fields out of only the form. (The builder verifies this; if hidden fields drop out of the list too, use `admin.condition: () => false` on the edit side instead.) `startsOn` stays in the sidebar unchanged.

Line-kind detection lives in a pure, unit-tested helper next to `src/utilities/orderDisplay.ts`, reusing `isOneTimeOrderItem` and the `SLOT_LABEL` values from `planBuilder.ts`.

## Constraints

- Brand: green and gold tokens; never `--gold-400` as text on light backgrounds; admin radii 6/10/16px; money only through `formatPaise`.
- WCAG 2.2 AA, 44px targets for links and copy buttons, `prefers-reduced-motion` respected.
- Payload UI imports come from the `@payloadcms/ui` root, never subpaths.
- Run `generate:importmap` after registering the component; commit `payload-types.ts` if it changes.

## Left to the builder

- Exact spacing and the responsive breakpoint at which sections go from two columns to one.
- Whether copy buttons are a small client island or plain selectable text.
