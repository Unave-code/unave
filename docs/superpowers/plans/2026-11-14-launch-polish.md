# Launch Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring every customer-facing page of the UNAVE site to launch quality, phone first, within the existing brand, and verify the full purchase path before deploying.

**Architecture:** Land the uncommitted product-kinds work, then screenshot-audit every customer route. The audit's ranked issue list (after the user's notes) drives one shared-component pass and then per-page passes in journey order, and the work ends with a test-mode launch check and a deploy. Stages 2–3 cannot pin exact component changes before the audit exists, so Task 3 ends by writing an addendum to this plan (`docs/superpowers/plans/2026-11-14-launch-polish-addendum.md`) that lists each audit issue as a concrete step under Tasks 4–8.

**Tech Stack:** Next.js 16.3.3, Payload 3.92.1, Tailwind v4 (`@theme` tokens in `src/app/(frontend)/globals.css`), Vitest 4 (int), Playwright 1.63 (e2e and screenshots), pnpm, lavish-axi review pages.

**Spec:** `docs/superpowers/specs/2026-11-14-launch-polish-design.md`

## Global Constraints

- `docs/design/design.md` is the UI contract. Refine within it: brand green + gold, Lora / Plus Jakarta Sans. No rebrand.
- Never use `--gold-400` as text on light backgrounds; use `--gold-600` or green.
- One primary action per section, pill-shaped buttons, CTA verbs (Message, Contact, Ask).
- WCAG 2.2 AA, 44px minimum targets, `prefers-reduced-motion` respected.
- Medical, allergy, diabetes and child-nutrition claims carry the `Notice` block nearby.
- Browsing and messaging never need an account. Buying requires sign-in.
- Customers live in `customers`, staff in `users`, with separate cookies.
- Header and footer copy and links come from the Payload globals. Never hard-code them in `src/Header/*` or `src/Footer/*`.
- Money is stored in paise and shown in rupees.
- Mobile first: design at 390px, then check 768px and 1280px. No horizontal scroll at 360px.
- Do not invent nutrition facts, delivery areas or customer proof.
- Before touching routing or data APIs, read the relevant guide in `node_modules/next/dist/docs/`.
- Payments are verified in Razorpay test mode only. Never switch to live keys.
- Every task ends with `pnpm exec tsc --noEmit`, `pnpm lint` and `pnpm test:int` passing. Tasks that touch flows also run the relevant `pnpm test:e2e` spec.

## Review Focus

1. **Long CMS content** (a 60-character product title, a 3-line description, a combo with 10 components) wraps cleanly at 360px without breaking a card or overflowing. Owner: Task 4, `tests/e2e/visual-stress.e2e.spec.ts`.
2. **Missing images** (product or category with no media) show the designed placeholder, not a broken box or a collapsed card. Owner: Task 4, same spec.
3. **A signed-out visitor tapping Buy or Checkout** is sent to sign-in and returned to the same cart afterwards, with the cart intact. Owner: Task 6, `tests/e2e/store.e2e.spec.ts`.
4. **An unavailable product or paused combo** is shown as unavailable and cannot be added to the cart from either the shelf or the detail page. Owner: Task 5, `tests/e2e/store.e2e.spec.ts`.
5. **Reduced motion** turns off the gallery autoplay, the swoosh and the scrolled-header transitions. Owner: Task 4, `tests/e2e/visual-stress.e2e.spec.ts` (with `reducedMotion: 'reduce'` emulated).

---

### Task 0: Land the uncommitted product-kinds work

**Files:**
- Review: every path in `git status` (product hooks, `normalizeProductShape.ts`, `ProductGallery.tsx`, `ComboHealth.tsx/.scss`, Store and home components, `payload-types.ts`, `importMap.js`, the int specs)
- Possibly create: `src/migrations/<timestamp>_product_kinds.ts` if `src/collections/Products/index.ts` changed the schema
- Test: `tests/int/product-kinds.int.spec.ts`, `tests/int/product-detail.int.spec.tsx`, `tests/int/product-shelf.int.spec.tsx`, `tests/int/home-subcategories.int.spec.tsx`

**Interfaces:**
- Produces: the committed product model with `type: 'plan' | 'one-time' | 'combo'`, `normalizeProductShape`, `ProductGallery` and `ComboHealth`. Later tasks style these as they are and do not change their behaviour.

- [ ] **Step 1:** Read the full `git diff` and the new files. Write a five-line summary of what the work intends, judged from its code and tests. If intent is unclear anywhere, stop and ask the user. Never revert new behaviour to old.
- [ ] **Step 2:** Run `pnpm generate:types` and `pnpm generate:importmap`. Expected: no diff beyond what is already uncommitted.
- [ ] **Step 3:** Check whether the Products schema change needs a migration: run `pnpm payload migrate:status`, and compare the collection fields with the latest migration in `src/migrations/`. If it needs one, run `pnpm payload migrate:create product_kinds`, review it, and make it guarded like the existing ones.
- [ ] **Step 4:** Run `pnpm exec tsc --noEmit && pnpm lint && pnpm test:int`. Expected: all pass. Fix failures in the WIP code, not by weakening tests.
- [ ] **Step 5:** Run `pnpm test:e2e tests/e2e/store.e2e.spec.ts tests/e2e/product-category.e2e.spec.ts`. Expected: pass.
- [ ] **Step 6:** Commit:
```bash
git add -A src tests docs/design/design.md
git commit -m "Add product kinds, product gallery and combo health"
```
Leave `.codex/` and `PRODUCT.md` uncommitted unless the user says otherwise.

### Task 1: Screenshot harness

**Files:**
- Create: `tests/audit/routes.ts` (the route and state list)
- Create: `tests/audit/capture.audit.spec.ts`
- Create: `playwright.audit.config.ts` (runs only `tests/audit`, projects `phone` 390×844 and `desktop` 1280×800, outputs to `.lavish/audit/shots/`)
- Modify: `.gitignore` (add `.lavish/`)

**Interfaces:**
- Produces: `export const auditRoutes: { id: string; path: string; setup?: 'emptyCart' | 'filledCart' | 'signedIn' | 'formError' }[]`. Tasks 3–8 reuse it for before/after shots. Run with `pnpm exec playwright test --config=playwright.audit.config.ts`; screenshots are written to `.lavish/audit/shots/<project>/<id>.png`.

- [ ] **Step 1:** Fill `auditRoutes` with real slugs read from the dev database: `/`, `/products`, each category shelf, one plan detail, one one-time detail, one combo detail, one unavailable product, `/cart` empty and filled, `/checkout` signed out and signed in, `/order-placed/<id>` for a test order, `/account`, `/sign-in`, `/sign-up`, `/forgot-password`, `/about`, `/our-kitchen`, `/contact` normal and with a form error, `/blog`, one post, `/search?q=dal`, and a 404.
- [ ] **Step 2:** Write `capture.audit.spec.ts`: one test per route per project, full-page screenshot after `networkidle`, with animations disabled. Also assert `document.documentElement.scrollWidth <= window.innerWidth` and record any failure in `.lavish/audit/overflow.json` instead of failing the test.
- [ ] **Step 3:** Start `pnpm dev`, then run the audit config. Expected: one PNG per route per project, and `overflow.json` written.
- [ ] **Step 4:** Commit the harness (not the shots): `git commit -m "Add screenshot audit harness"`.

### Task 2: Automated checks feeding the audit

**Files:**
- Modify: `tests/audit/capture.audit.spec.ts` (add an axe pass per route)
- Add dev dependency: `@axe-core/playwright`

- [ ] **Step 1:** Run `AxeBuilder` with the tags `wcag2a`, `wcag2aa`, `wcag21aa` and `wcag22aa` per route on the phone project, and write the violations to `.lavish/audit/axe.json`. Also record interactive elements smaller than 44×44px to `.lavish/audit/targets.json`.
- [ ] **Step 2:** Run it. Expected: three JSON files with per-route findings.
- [ ] **Step 3:** Commit: `git commit -m "Add accessibility and target-size checks to audit"`.

### Task 3: Audit review page and addendum

**Files:**
- Create: `.lavish/audit/index.html` (review page, in UNAVE's own tokens from `globals.css`)
- Create: `docs/superpowers/plans/2026-11-14-launch-polish-addendum.md`

- [ ] **Step 1:** Look at every screenshot yourself. For each issue record: id, route, viewport, severity (blocker / major / minor), shared or page-specific, the `design.md` rule it breaks (if any), a one-line fix proposal, and whether it is a meaningful layout change (needs sign-off) or a straight fix.
- [ ] **Step 2:** Build the review page: issues grouped by Shared, Home, Products, Ordering and Info, with the relevant screenshot crop beside each, and the axe, overflow and target findings merged in. Missing features that block launch get their own section at the top.
- [ ] **Step 3:** Open it with `lavish-axi .lavish/audit/index.html` and run `lavish-axi poll .lavish/audit/index.html` in the foreground until the user sends notes.
- [ ] **Step 4:** Write the addendum. Turn each accepted issue into a checkbox step under Task 4 (shared), 5 (products), 6 (ordering), 7 (home) or 8 (info), with the exact component file, the token or class change, and the screenshot id that proves it. Each launch blocker the user confirmed becomes its own task with a test.
- [ ] **Step 5:** Commit the addendum: `git commit -m "Add audit findings to launch polish plan"`.

### Task 4: Shared system pass

**Files (expected; the addendum is authoritative):** `src/app/(frontend)/globals.css`, `src/components/home/Section.tsx`, `src/components/Store/ProductCard.tsx`, `src/components/Cta/index.tsx`, `src/components/ui/*` (button, input), `src/components/Notice.tsx`, `src/Header/*`, `src/Footer/*`, `docs/design/design.md`
- Test: `tests/e2e/visual-stress.e2e.spec.ts` (new)

**Interfaces:**
- Produces: any new tokens or utilities as named in the addendum. Tasks 5–8 use them and do not add page-local equivalents.

- [ ] **Step 1: Write the failing stress spec** `visual-stress.e2e.spec.ts` at 360px:
  - `long product title and description do not overflow`: render the shelf with a product whose title is 60 characters, and expect `scrollWidth <= innerWidth` and the card's height to be equal to its siblings in the row.
  - `missing product image shows placeholder`: expect `[data-testid="product-image-placeholder"]` to be visible and the card to keep its aspect ratio.
  - `reduced motion disables gallery autoplay and header transition`: with `reducedMotion: 'reduce'`, the gallery slide index stays the same after 6s, and the header's computed `transition-duration` is `0s`.
- [ ] **Step 2:** Run it: `pnpm test:e2e tests/e2e/visual-stress.e2e.spec.ts`. Expected: it fails wherever the audit found these problems.
- [ ] **Step 3:** Apply the addendum's Shared steps. Update `design.md` wherever a component spec changes.
- [ ] **Step 4:** Run the stress spec, then the full gate. Expected: pass. Re-run the audit capture and check the phone shots of every route for regressions.
- [ ] **Step 5:** Commit: `git commit -m "Polish shared components for launch"`.

### Task 5: Products shelf and detail pass

**Files:** `src/app/(frontend)/(site)/products/**`, `src/components/Store/ProductDetail.tsx`, `ProductPurchase.tsx`, `ProductGallery.tsx`, `ProductShelfControls.tsx`
- Test: `tests/e2e/store.e2e.spec.ts`, `tests/int/product-detail.int.spec.tsx`

- [ ] **Step 1: Failing test** in `store.e2e.spec.ts`: `unavailable product cannot be added from shelf or detail`. On a product with `available: false`, the shelf card shows the text "Unavailable" and has no enabled add control, and the detail page's purchase button is `disabled`. Run it. Expected: pass or fail. If it already passes, keep it as a guard.
- [ ] **Step 2:** Apply the addendum's Products steps.
- [ ] **Step 3:** Run the gate plus the store and product-category e2e specs, and re-capture the product shots. Expected: pass, and the addendum issues are visibly fixed.
- [ ] **Step 4:** Commit: `git commit -m "Polish product shelf and detail pages"`.

### Task 6: Ordering flow pass

**Files:** `src/app/(frontend)/(site)/cart/`, `checkout/`, `order-placed/`, `account/`, `src/app/(frontend)/sign-in|sign-up|forgot-password|reset-password/`, `src/components/CustomerAuth/*`
- Test: `tests/e2e/store.e2e.spec.ts`

- [ ] **Step 1: Failing test** `signed-out checkout returns to cart after sign-in`. Add two items, go to `/checkout`, and expect a redirect to `/sign-in?next=/checkout` (or the existing param name). Sign in with an email-password test customer and expect to land on `/checkout` with both items listed.
- [ ] **Step 2:** Run it. Expected: it fails if the return path or the cart is lost.
- [ ] **Step 3:** Apply the addendum's Ordering steps.
- [ ] **Step 4:** Run the gate and the store e2e spec, and re-capture the ordering shots.
- [ ] **Step 5:** Commit: `git commit -m "Polish cart, checkout and account pages"`.

### Task 7: Homepage pass

**Files:** `src/app/(frontend)/(site)/page.tsx`, `src/components/home/*`, `src/globals/Hero/`, `src/globals/HomeCategoryImages/`
- Test: `tests/int/home-subcategories.int.spec.tsx`, `tests/e2e/frontend.e2e.spec.ts`

- [ ] **Step 1:** Apply the addendum's Home steps. If a step changes which data a section reads, add a test to `home-subcategories.int.spec.tsx` first.
- [ ] **Step 2:** Run the gate and the frontend e2e spec, and re-capture the home shots.
- [ ] **Step 3:** Commit: `git commit -m "Polish homepage"`.

### Task 8: Info pages pass

**Files:** `about/`, `our-kitchen/`, `contact/`, `blog/**`, `search/`, `[...notFound]/`, `[slug]/`
- Test: `tests/e2e/about-contact.e2e.spec.ts`

- [ ] **Step 1:** Apply the addendum's Info steps. Where a page makes a medical, allergy, diabetes or child-nutrition claim, assert in `about-contact.e2e.spec.ts` that a `Notice` is rendered in the same section.
- [ ] **Step 2:** Run the gate and the about-contact e2e spec, and re-capture the info shots.
- [ ] **Step 3:** Publish a before/after review page (`.lavish/after/index.html`) covering Tasks 4–8 and poll for the user's notes. Fold their notes into fixes on the same tasks.
- [ ] **Step 4:** Commit: `git commit -m "Polish info pages"`.

### Task 9: Launch check and deploy

**Files:** `docs/scope/scope.md`, `PRODUCT.md`, `AGENTS.md`, `docs/launch-checklist.md` (new)

- [ ] **Step 1:** Run the full suite `pnpm test` and the audit capture again. Expected: all pass, `overflow.json` is empty, and `axe.json` has no serious or critical violations.
- [ ] **Step 2:** In Razorpay test mode, place an order end to end in the browser: add items, sign in, pay with the test card, land on order-placed. Confirm the order and its lines in `/admin/collections/orders`, and confirm the order email in `/admin/collections/email-log`.
- [ ] **Step 3:** Ask the user to sign in with a real Google account in the browser. Confirm a `customers` row is created or linked, and that `/admin` is refused for that session.
- [ ] **Step 4:** Run Lighthouse (mobile) on `/` and one product detail page. Record the scores in `docs/launch-checklist.md`. If performance is under 80 or accessibility under 95, list the causes and fix any that are blockers.
- [ ] **Step 5:** Update the docs:
  - `AGENTS.md`: replace "Never require an account…" with "Never require an account to browse or send a message; buying requires sign-in."
  - `PRODUCT.md`: product, plan and combo wording to match the current model.
  - `scope.md`: tick what shipped.
- [ ] **Step 6:** Write `docs/launch-checklist.md`: steps to switch to live Razorpay keys, register the live webhook URL, and place one real order.
- [ ] **Step 7:** Commit, then confirm with the user before deploying (this step is outward-facing). Deploy per `docs/deploy.md`, then smoke-test production: home, one product, cart, sign-in page and contact form.
