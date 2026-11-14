# Launch polish: audit addendum

Source: `.lavish/audit/index.html` (local review page) and `.lavish/audit/notes.md`, reviewed by the user on 2026-11-14.
Decision: every code item is approved ("fix it"). C1 (products entered as meal plans) and C2 (plan-centred copy) are deferred. C3 (banner and photo choices) is to be fixed now.

Each step names the file, the change, and the screenshot that proves it. Re-capture with `pnpm exec cross-env NODE_OPTIONS="--no-deprecation --import=tsx/esm" playwright test --config=playwright.audit.config.ts`.

## Task 4: Shared (plus blockers)

- [ ] **B1** `src/Footer/View.tsx`: change the footer's base background from `bg-green-900` to the light cream token, so its text is readable before the photo paints, and load the photo with `priority={false} loading="eager"`. Test: `visual-stress` checks that a footer link has AA contrast against the footer's computed background with images blocked (`page.route('**/*.{jpg,webp,png}', r => r.abort())`). Shots: `phone/about`, `phone/products`.
- [ ] **B2** Header search: the pill in `src/Header/Component.client.tsx:232` links to `/products#shelf-search` (or `/products?q=`). `src/app/(frontend)/(site)/search/page.tsx` redirects `/search?q=x` to `/products?q=x`, so the blog-only search is retired. e2e: typing "podi" in header search shows the Sambar Podi card.
- [ ] **B3** Delete the dev subcategories whose slug starts with `it-`. Extend `tests/helpers/sweepRun.ts` with `sweepSubcategories(payload, run)` and call it from the specs that seed subcategories (combo-product, order-endpoints). Shot: `desktop/home` "Browse" row shows only real subcategories.
- [ ] **B4** FAQ copy (find the source: homepage FAQ copy file or CMS block): "How do I order?" becomes "Add what you want to your cart and pay at checkout. Prefer to talk first? Message us on WhatsApp and the kitchen will help." Make sure "Do I need an account?" says an account is needed only to pay.
- [ ] **S1** Replace `text-gold-600` on light backgrounds in the homepage subtitle, and `text-success` for "Available to order", with `text-green-700`. axe `color-contrast` is clean on `home` and `product-*`.
- [ ] **S2** Give a 44px minimum hit area to: the category badge link on product detail, "Keep browsing products" on the cart, blog card title links, footer links, and the header and footer logo links. `smallTargets` in the checks JSON is empty apart from sr-only inputs.
- [ ] **S3** Header search placeholder: "Search products".
- [ ] **S4** Announcement strip, under `md`: show the first message and its link on one line, with no clipped text. Desktop is unchanged.
- [ ] Stress spec `tests/e2e/visual-stress.e2e.spec.ts` (from the plan): long title, missing image, reduced motion, and the B1 footer-without-images case.

## Task 5: Products

- [ ] **P1** `ProductCard` compact variant: under 640px the shelf grid is `grid-cols-2`, with a square photo, title (2-line clamp), lead price, and the whole card as the link. Tablet and desktop are unchanged. Shot: `phone/products` shows two cards per row.
- [ ] **P2** `ProductShelfControls`: under `md` the search stays visible and the facets, price and sort sit in a `<details>` labelled "Filters (n)" (works without JS), open by default when any filter is active.
- [ ] **P3** Products page: the hero CTA "See what's open today" anchors to the shelf, and the closing CTA becomes "Message us on WhatsApp".
- [ ] **P4** The "More from the kitchen" section on product detail uses the P1 compact cards in a 2-col grid on phone.
- [ ] **P5** The product details table hides rows that repeat the badges (Category, For), and is hidden under `md` if no rows remain.
- [ ] Rewrite stale `tests/e2e/product-category.e2e.spec.ts` against the current shelf bar (it still expects the icon pills removed in 60c53fe). Add `unavailable product cannot be added from shelf or detail` (Review Focus 4). Re-run `store.e2e`.

## Task 6: Ordering

- [ ] **O1** Cart line: 56px square thumbnail (product image or brand placeholder).
- [ ] **O2** Cart: one summary block (lines, Total, "Go to checkout"). Remove the "One payment" card and the repeated sentence.
- [ ] **O3** Checkout: under `lg`, a compact summary (item count, names, To pay) above "Where the meals go". The full summary keeps its desktop position.
- [ ] **O4** Checkout fields: `autocomplete` name / tel / postal-code / address-line1 / address-line2 / address-level2 / address-level1, and `inputmode="tel"` / `"numeric"` on phone and pincode.
- [ ] Test (Review Focus 3): `signed-out checkout returns to cart after sign-in` (redirect param is `return`).

## Task 7: Homepage

- [ ] **H1** Under `md`: the headline "Good food, cooked in our own kitchen" and one "Shop products" pill come first, then the carousel. Remove the empty top gap.
- [ ] **H2** Gallery under `md`: horizontal scroll-snap row, about 85% card width. Desktop keeps the 3-up grid.
- [ ] **H3** Best sellers: drop "Buy now" (one primary action), equal-height cards, row centred when it has fewer than 4 cards.
- [ ] **C3** Find whether the FAQ steak photo is a code asset or CMS media, and replace it with a vegetarian kitchen photo already in `public/media` or `public/images`. The hero banners are CMS media on production: list them for the user to swap in the admin, and don't edit production data.

## Task 8: Info

- [ ] **I1** About values: `md:grid-cols-2`.
- [ ] **I2** No page-specific work beyond the shared fixes. Re-capture to confirm.
