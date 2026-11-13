# 0010. Meal combo maker

**Date**: 2026-11-12
**Status**: Accepted

## Summary

Staff can build a fixed price combo in the admin from products already in the store. Customers find it with the other products and buy it through the current cart and checkout. Each paid order keeps a copy of the combo contents, even if staff later change the combo.

## Context

The store has one time products and meal plans with selectable durations. Staff need to group existing products into fixed meal combos, set one price, and sell those combos through the current store. A combo may include a meal plan, so its included duration must be fixed by staff.

Orders are written only after payment succeeds. The current payment flow keeps checkout details in Razorpay notes, which have a size limit. Combo contents must remain stable while payment is in progress and be available to both the browser return and the payment webhook without creating an unpaid order.

## Requirements

**User stories**:

1. As staff, I want to make a combo from products already in the catalogue and set its price, so I can manage bundles without a code change.
2. As a customer, I want to find and buy a combo with the other products, so I can use the current cart and checkout.
3. As kitchen staff, I want each paid order to show the combo contents as purchased, so later product edits do not change what the order says.

**Acceptance criteria**:

1. **AC-1**: Staff can create and edit a combo in the Payload Products admin using the existing product title, generated unique slug, image, description, category, subcategory, audience, availability, and featured fields. A combo has one staff entered price, entered in rupees and stored as an integer of at least one paise. The rupee field accepts at most two decimal places and rejects excess precision rather than rounding. Existing product minimum and safe integer checkout amount checks apply. A combo has no duration list of its own.
2. **AC-2**: A combo has from two to ten distinct components. Each component points to an existing one time product or meal plan and appears once. A product can be reused in more than one combo. A combo cannot contain another combo. When staff select a meal plan, they must select one of its current durations by its unique label. Labels are compared after trimming and without case sensitivity, matching the existing duration lookup; duplicates under that comparison cannot be selected ambiguously. If the selected label no longer matches exactly one current duration, the component is invalid until staff selects a current duration. The admin uses standard Payload component rows, shows a duration choice only for meal plans, and prevents duplicate product references.
3. **AC-3**: Combos appear on the existing product shelf, category shelves, product pages, related product lists, and featured shelf according to their normal product fields. The product page shows each included product and its selected meal plan duration, when applicable. An unavailable combo remains visible with the existing paused treatment and has no add to cart control. Combos use the existing product page and cart flow. No combo specific public route or API is added. Customers can browse without an account; checkout keeps the existing sign in requirement.
4. **AC-4**: A combo is sellable only when its own availability is on and every component exists and is available, and every selected meal plan duration still exists with an unambiguous label. Deleting a source product is allowed and makes affected combos unavailable until staff repair them. Changes to a source product revalidate product shelves, category shelves, product detail, related products, and the featured shelf through the existing product revalidation path.
5. **AC-5**: A combo uses the existing one time cart behavior: its cart line uses the reserved `one-time` duration, customers can add from one to ten copies, and a cart holds at most ten distinct lines. Prices and totals are resolved on the server from the combo's current `price`. The browser never supplies a price or component list. A stale combo remains visible in the cart, is marked unavailable, has no quantity control, is excluded from the total, and can be removed. Checkout refuses a stale combo with the existing plain unavailable item message.
6. **AC-6**: The existing signed in checkout creates a temporary server side intent containing the verified customer ID; the validated delivery snapshot (`name`, `phone`, `addressLine1`, `addressLine2`, `city`, `state`, `pincode`, `foodPreference`, and `note`); and every item snapshot (`productId`, `productTitle`, `durationLabel`, `days`, `qty`, and `unitPrice`) with nested combo component snapshots (`productId`, `productTitle`, and selected plan `durationLabel` and `days`). The server resolves item and component values from the current product records and calculates the total as the sum of `unitPrice` multiplied by `qty`. The intent is saved before payment details are returned to the browser. A failed save does not launch payment. No order row is created before a captured payment.
7. **AC-7**: The verified browser return and signed payment webhook use the same intent keyed by the unique Razorpay order ID. The browser return must pass Razorpay signature verification, and the webhook must pass HMAC verification. Both require a captured payment, matching gateway order ID, INR currency, and an exact integer paise amount equal to both the gateway order amount and intent total. They then create one paid order. A unique database constraint on `gatewayOrderId` resolves simultaneous return and webhook writes; the losing writer reads and returns the already written order. Before reading an intent, either signal checks for an order already written for that gateway order ID and returns the existing result when the customer owns it. A combo remains one order line, with its price and quantity plus a frozen component snapshot containing each component name and, for meal plans, the selected duration label and days. Component prices are not stored as order line prices. The order confirmation, account, admin, and existing order emails show the combo and its component snapshot. Changes to a combo after the payment step opens do not change that intent.
8. **AC-8**: An intent is deleted only after its paid order is committed. A failure to delete a committed intent is logged and leaves the record for a safe retry; idempotent order lookup prevents a duplicate order. An unpaid intent may be deleted after 30 days only when the gateway explicitly confirms that no payment was captured. A timeout, error, or indeterminate gateway result retains the intent and logs the failure. A captured payment with a missing or unreadable intent never causes an order to be guessed from current product data; the gateway order ID, payment ID, and gateway status are logged without customer personal data so staff can compare them in Razorpay and reconcile manually.
9. **AC-9**: The application does not expose a combo audit collection or write audit records. Creating, editing, or deleting a combo does not depend on audit storage.
10. **AC-10**: Products remain publicly readable and staff writable under the existing access rules. Orders remain readable only by staff and their owning customer, and are writable only by payment confirmation. Checkout intents have no public REST, GraphQL, or admin access and are read or written only by server payment code. No card data is stored by Unave.
11. **AC-11**: Existing product accessibility and content rules continue to apply to combo surfaces. Controls retain at least 44 pixel targets, keyboard focus remains visible, and reduced motion is respected. Every combo product page places the existing `Notice` component next to the combo description and included products, with the title “A note on our meals” and text “Our meals are food options and are not a substitute for medical or nutritional advice.” This keeps the required notice beside any medical, allergy, diabetes, or child nutrition claim.

## Options considered

### Option 1: Store combo contents as description text

Staff could list included products in the product description and sell the combo as a one time product.

**Pros**:

1. It adds little schema and uses the existing price and checkout flow.
2. Staff can begin without a structured product selector.

**Cons**:

1. The system cannot validate missing products, duplicate components, or meal plan durations.
2. Cart and order records cannot reliably preserve structured combo contents.

### Option 2: Add a combo product type and server side checkout snapshot

Combos live in Products and use product relationships for their contents. A private temporary intent stores the complete checkout snapshot until payment is confirmed.

**Pros**:

1. Combos reuse the current product shelf, cart, checkout, and order access rules.
2. The database can validate components and preserve exactly what was paid for.

**Cons**:

1. The product and order models need an additive migration.
2. Unpaid intents need a scheduled cleanup task and reconciliation logging.

### Option 3: Create a separate Combos collection and purchase flow

Combos could have their own collection and custom routes, then be adapted into the existing order flow.

**Pros**:

1. Combo fields stay separate from ordinary product fields.
2. A future combo editor could grow without changing the product editor.

**Cons**:

1. Public product pages and cart code would need a second source of products.
2. The extra integration creates more paths for price and availability behavior to diverge.

## Decision

**Chosen option**: Option 2: Add a combo product type and server side checkout snapshot.

Combos are Products with structured component references, and the existing store and payment flow remains the only customer purchase path.


## Rationale

The staff need is a fixed price bundle built from existing catalogue items, not a second store. A product type keeps each combo on the existing product shelf and avoids duplicating price, category, cart, and customer access behavior. The component relationships make validation possible and let a meal plan component carry one selected duration.

The gateway note limit makes the current checkout intent unsuitable for larger combo baskets. A private Payload record is the smallest durable place in the existing PostgreSQL database to keep the exact order data needed by either payment signal. It is not an order and does not change the rule that an order means a captured payment. A scheduled Payload job can clean abandoned intents using the existing job runner.

Combo audit records are not needed for this feature. Existing audit tables and records are retained, but the application does not register or access them.

## Feature design

**Data model sketch**:

1. `products` remains the catalogue. Add `combo` to the required `type` choices.
   1. Reuse the required `title`, unique `slug`, `category`, `subcategory`, and `audience` fields. Existing optional description, points, and image fields remain available.
   2. Reuse the existing `price` field as a required integer in paise, at least one paise, for combos. Staff enter rupees through `RupeeField`; the shared conversion rejects more than two decimal places instead of rounding. Combos have no product level `durations`.
   3. Add a `components` array for combo products only, with two to ten rows. Each row has a required relationship to `products` and an optional `durationLabel`. The duration is required when the referenced product is a meal plan and must match one of its current durations. It is empty for a one time product. No quantity is stored because each component appears once.
   4. Existing `available` and `featured` fields apply. Effective availability is derived from the combo flag and all component states. Existing `compareAtPrice` and `packSize` remain limited to one time products.
   5. The self relationship is one combo to two through ten non combo products. A source product may be referenced by many combos. A combo cannot reference itself or any other combo.
2. `orders` remains the paid order collection. A combo is one item with a relationship to the combo product, `productTitle`, `qty`, and `unitPrice` snapshot fields. Its `durationLabel` is the reserved `one-time` value and its `days` is zero. Its nested `components` snapshot has the optional source product relationship, required product title, and optional duration label and days. Relationships may become empty if a product is deleted; the snapshot text remains. The order's unit price is the combo price, with no component price allocation. Existing order fields stay immutable after creation.
3. `checkoutIntents` is a private temporary collection. Each record has a unique required `gatewayOrderId`, required customer relationship, required delivery snapshot, required `items` array, required total in paise, and required `expiresAt`. Each item stores the product relationship, title, duration label, days, quantity, unit price, and for combos, component references and snapshots. The collection is created for a gateway order, removed after its paid order is written, or removed after 30 days only after the gateway confirms no payment was captured. It has no admin listing or public API.
4. Combo audit tables are not part of the application model. Any existing audit tables and records remain stored, with no application reads, writes, or cleanup.
5. Existing `media`, `subcategories`, `customers`, `users`, and `orders` records remain the related entities. Existing products need no backfill; only the new type and nullable or new fields and collections require schema changes.

**State transitions**:

1. A combo's sellable state is derived. It is available when its own `available` flag is true, all referenced products exist and are available, and any selected plan durations still match. Staff can pause it directly.
2. A checkout intent exists after payment order creation. A captured payment creates one paid order and then removes the intent. An unpaid intent is removed after 30 days only after the gateway confirms it was not captured.
3. An order is born paid and its item and component snapshots never change.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| Payload `/api/products` and `/api/products/:id` | GET, POST, PATCH, DELETE | Existing product fields plus combo components | Product record | Public read, staff write | 403, 404, 422 invalid or duplicate components |
| `/products`, `/products/[slug]`, category shelves | GET | Slug, category, existing shelf filters | Product details, combo contents, current price, availability | Public | 404, unavailable product |
| `/api/cart/add`, `/api/cart/qty`, `/api/cart/remove` | POST | Product slug, reserved `one-time` duration, quantity delta or line key | Redirect and cart cookie | Public | Invalid or unavailable product, stale component, line or quantity cap |
| `/cart`, `/checkout` | GET | Cart cookie; checkout also uses customer session | Live lines, totals, stale state, delivery form | Public cart; signed in customer checkout | Empty cart, stale combo, sign in required |
| `/api/orders/create` | POST | Delivery fields and note; product lines come from the cart cookie | Gateway order ID, amount, key ID, mode | Signed in customer | 401, 422 invalid or stale cart, 429, 503 |
| `/api/orders/verify` | POST | Razorpay order ID, payment ID, signature | Paid order ID and status | Signed in customer who owns the intent | 400 failed payment checks, 404 unknown or unowned intent, 500 order write failure |
| `/api/razorpay/webhook` | POST | Raw signed Razorpay event | 200 after one paid order is recorded or already exists | Public route, valid HMAC required | 400 invalid signature; missing intent is logged for reconciliation without creating an order; transient lookup failures are retryable |
| Payload scheduled intent cleanup | Daily job | Expired intents and gateway order IDs | Deleted unpaid intent count | Existing Payload job access and `CRON_SECRET` | Gateway lookup failure keeps the intent and logs the failure |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Edit a combo | Title, slug, image, description, category, subcategory, audience, and featured state | Existing `products` fields and `autoProductSlug` |
| Edit combo contents | Component names and categories | Referenced product records |
| Edit a plan component | Selected duration label and days | Matching row in the referenced product's `durations` |
| Show a combo price | Price in rupees | `products.price` in paise, formatted by `formatPaise` |
| Determine combo availability | Own availability and component availability | `products.available`, referenced product existence, and selected duration match |
| Render product shelves and detail | Combo copy, category, image, price, paused state | The combo product record and current component records |
| Show the paused treatment | Paused label and disabled purchase action | Existing product card and detail components, using the derived combo availability |
| Add or render cart line | Product slug, reserved duration, quantity | Cart cookie and existing one time cart rules |
| Compute cart and checkout totals | Each line and total in paise | Current combo `price` resolved on the server, multiplied by cookie quantity |
| Create a checkout intent | Customer and delivery | Verified customer session and validated checkout request |
| Create a checkout intent | Product IDs, titles, combo components, duration labels, days, quantities, prices, total | Cart cookie identifiers resolved against current product records on the server |
| Create a checkout intent | Gateway order ID and expiration timestamp | Razorpay response and server clock plus 30 days |
| Confirm payment and create order | Captured amount, currency, payment ID, and order ID | Razorpay REST response or signed webhook, checked against the intent |
| Write a paid combo order | Combo title, price, quantity, component titles, plan duration labels and days | The immutable checkout intent snapshot |
| Clean an abandoned intent | Whether a payment was captured | Current payment status fetched from Razorpay; no captured payment is required before deletion |
| Log a payment reconciliation failure | Gateway order ID, payment ID when available, gateway status, and failure reason | Razorpay response or signed event, plus server error details; never customer personal data |
| Show the required combo notice | Title, text, and presentation | `docs/design/design.md` sections 6.9 and 6.12 and existing `src/components/Notice.tsx` component |

**Key invariants**:

1. A combo has two to ten distinct non combo product components. A plan component has exactly one currently valid duration.
2. A combo price is a single staff entered value. Component prices never set the combo total.
3. The server resolves every cart line, component, duration, and price from the database. Browser data cannot set the order amount or component snapshot.
4. A combo with a missing, paused, or invalid component cannot be added to a new order.
5. Each payment intent maps to at most one paid order, enforced by the unique `gatewayOrderId`. The browser return and webhook can race without writing two orders.
6. A previously recorded order is returned idempotently before looking for a deleted intent.
7. The checkout intent remains until the order write succeeds. A paid order always has its frozen component snapshot.
8. A missing intent never falls back to current product data for a captured payment.

**Security model**:

Products follow the existing access rules: public read and staff write. Customers must use the existing signed in checkout and can read only their own paid orders. Staff can read all orders. Checkout intents are server only, with no admin screen, public REST access, or GraphQL access. The temporary intent duplicates delivery information already held for checkout, so its access is restricted and its lifetime is bounded. Razorpay continues to handle card data; Unave stores no card number or security code. No additional regulatory requirement was identified.

**Configuration required**:

None. Reuse the existing database, Razorpay credentials, and scheduled Payload job access.

**Critical test scenarios**:

1. Price and editing: staff can enter valid rupee values including paise, excess decimal precision is rejected without rounding, and invalid or duplicate component and duration selections cannot be saved. Verifies **AC-1**, **AC-2**.
2. Happy path: staff creates a combo containing a one time product and one fixed duration of a plan, a customer adds it to the cart, pays, and sees one paid order line with the frozen component snapshot in the order, account, admin, and emails. The product page also shows the required nearby notice title and text. Combo creation succeeds without an audit collection or write. Verifies **AC-2**, **AC-3**, **AC-5**, **AC-6**, **AC-7**, **AC-9**, **AC-11**.
3. Availability and cart: a missing, paused, or invalid duration component makes the combo visibly unavailable and prevents purchase; a stale cart line is marked, excluded from the total, and blocks checkout. Verifies **AC-3**, **AC-4**, **AC-5**.
4. Payment consistency: the return and webhook race, or the source combo changes after payment begins; exactly one order is written from the original intent. Invalid signature, status, order ID, currency, or amount is rejected. A missing intent creates no guessed order and logs gateway and payment IDs when available. Verifies **AC-6**, **AC-7**, **AC-8**.
5. Retention: an unpaid intent is retained until 30 days and is deleted only after an uncaptured gateway result; a timeout, captured, or unreadable result is retained. Verifies **AC-8**.
6. Auth and privacy: an anonymous visitor can browse but cannot check out; a customer cannot read another customer's order or any intent. Verifies **AC-3**, **AC-10**.

## Build plan

Ordered for the Tracer Bullet approach: first prove one combo can travel from the staff form through the existing paid order path, then add all validation and failure handling.

1. Add one guarded migration for the combo product type and component rows, order component snapshots, and private checkout intents. Keep existing product rows valid without backfill. Satisfies **AC-1**, **AC-2**, **AC-6**, **AC-7**.
2. Build the first full path through standard Payload component rows, product detail and shelf rendering, the nearby notice, one time cart resolution, checkout intent creation, payment confirmation, and a paid order snapshot. Satisfies **AC-1**, **AC-3**, **AC-5**, **AC-6**, **AC-7**, **AC-11**.
3. Harden component validation, availability derivation, invalid duration handling, stale cart behavior, and cache revalidation when source products change. Satisfies **AC-2**, **AC-4**, **AC-5**.
4. Integrate the intent with both payment signals, verify payment values, make order creation idempotent, update customer and staff order views and existing order emails, and add the 30 day cleanup job with explicit reconciliation logging. Satisfies **AC-6**, **AC-7**, **AC-8**, **AC-10**.
5. Keep combo audit storage out of the application and cover checkout races, stale combos, access rules, and the main customer journey with focused unit, integration, and end to end tests. Satisfies **AC-2**, **AC-4**, **AC-5**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**.

## Consequences

**Positive**:

1. Staff manage combo products where they already manage products.
2. Customers use one catalogue, cart, and checkout.
3. Paid orders retain the exact combo contents used for payment.
4. The design adds no external service or dependency.

**Negative / tradeoffs**:

1. The product and order schemas gain nested component data and need a guarded migration.
2. Unpaid payment attempts now require a temporary database record and gateway status checks during cleanup.
3. Combo edits do not have a separate audit history in the admin. Existing database audit tables and records are left untouched and unused by the application.
4. Changes to a source product can pause several combos, so staff need to repair or reenable affected products deliberately.

**Neutral**:

1. Existing products remain valid and need no backfill.
2. Combos use the existing customer account requirement at checkout and do not add a new public route.

## Follow-up

None identified.
