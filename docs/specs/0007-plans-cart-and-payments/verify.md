# Verify steps: plans and payments (spec 0007)

Run these against the dev server (`pnpm dev`, port 3000) after `/develop`. Steps marked **[keys]** need `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` in `.env` (test keys). Everything else runs with or without them.

## AC-1: the plans shelf

1. Sign out (or use a private window). Open `/plans`.
2. Every plan renders as a pricing card with its description, every duration with its own total, and one **Add to cart** control; no photo band.
3. Turn a plan's `available` off in the admin and reload `/plans`: the plan still renders, with the **Paused** label, its durations listed, no cart control, and the gold "what paused means" notice under the grid.
4. With JavaScript disabled, the page still renders the full grid, every chip, and a working **Add to cart** button.
5. Open `/sitemap.xml` and confirm `/plans` is listed.

## AC-2: adding to the cart

1. On any open card, pick a duration chip and press **Add to cart**. The page does not move; the message "Added to your cart." appears under the button and the header count rises (if staff have added the cart link).
2. With JavaScript disabled, press **Add to cart**: the form posts, the shelf reloads, and the line is in the cart (visit `/cart` to confirm).
3. Add the same plan and duration again: the sentence "That plan and duration is already in your cart." appears and the count does not change.
4. Fill the cart to ten lines (a script or repeated adds), then add an eleventh: "Your cart holds ten plans. Remove one from the cart before adding another." appears.
5. Pause a plan in the admin, reload its shelf, and confirm its card has no add control. A direct form post naming the paused plan redirects to `/cart` with the paused sentence.
6. No card links to `/checkout`; the only way there is through the cart page.

## AC-3: the cart page

1. Open `/cart`: every line shows the plan title, the duration label, the days, and the live price; the total is the sum.
2. Edit a plan's price in the admin and reload `/cart`: the line shows the new price. The cookie carried no number.
3. Remove a line with **Remove**: it leaves the list and the total drops. With JavaScript disabled the removal still works.
4. Put a line in the cookie whose plan does not exist (or pause its plan): the line renders marked **No longer available**, is excluded from the total, and the sentence above the list explains it.
5. Empty the cart: the plain empty state with **Browse the plans** shows.
6. View source or the rendered meta: the page is `noindex` and absent from the sitemap.

## AC-4: checkout

1. With a line in the cart and signed out, press **Go to checkout**: sign in is required, and the return path carries `/checkout`. Sign in: the cart is intact, every line renders with live prices and the server computed total.
2. The delivery form is prefilled from the saved profile and stays editable for this order alone.
3. Open `/checkout` with an empty cart (or an old shared link): one plain sentence and a **Browse the plans** pill, never a form.
4. Put a stale line in the cart and open `/checkout`: payment is blocked with one sentence and a **Review your cart** pill.

## AC-5: order creation **[keys]**

1. Press **Pay for the order** with a filled form: the Razorpay popup opens for the sum of the lines. The server log shows `order_started` with the mode, the line count and the total; the request body the browser sent carried no lines and no amount.
2. Tamper checks (a scripted request with an 11 line cookie, a duplicated line, an unknown plan, a paused plan, a removed duration, an empty cart) each answer 422 with one plain sentence and create no gateway order.

## AC-6: the verified return **[keys]**

1. Pay in the popup and return: the order page shows every line, the total and the payment id; the cart is empty (the header count resets); pressing checkout again shows the empty cart sentence.
2. Replay the verify call: the same order id answers, no second row, one mail pair.

## AC-7: the webhook **[keys]**

1. Configure the webhook secret in the dashboard (or replay a signed event by hand): a captured payment writes the same order the return would have, with every line from the notes.
2. An unsigned or forged body answers 400 and writes nothing; an event with no readable intent answers 200, logs, and writes nothing.

## AC-8: the mails **[keys]**

1. Both mails arrive: the customer confirmation and the kitchen notice, each listing every line (plan, duration, days, price) and the total.

## AC-9: the account list

1. The account's **Orders** view lists the order newest first with its lines, the total and the payment id.
2. Customer A cannot open customer B's receipt; the REST collection refuses cross customer reads (the integration tests prove the denials).

## AC-10: the admin

1. In the admin, open an order: every line with its plan, duration, days and unit price, the delivery snapshot, the note, the payment details and `startsOn` are all visible and staff editable where the spec allows.
2. The collection description says one row is one completed payment holding up to ten line snapshots.

## AC-11: snapshots never rewrite

1. Edit a plan's title or price after a purchase; the past order's lines and total are untouched everywhere they render.

## AC-12: chrome

1. In the admin (Site chrome, header), add a link to `/cart`: it renders in the menu with the live count, without a deploy.
2. The chrome copy implies a basket, not one plan per order (the header pill says *Browse the plans*).

## AC-13: configuration

1. `.env.example` documents the three Razorpay variables; without them the site browses and messages normally and the pay action answers the plain configuration sentence.
2. The active mode is logged at order creation and visible in the admin order view.
