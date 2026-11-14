# Launch polish: customer-facing site

Date: 2026-11-14 · Status: draft for approval

## Intent

Every customer route already exists (home, products, product detail, cart, checkout, order placed, account and auth, about, our kitchen, contact, blog, search). What stops a launch is that the site looks unpolished across all four areas: homepage, product pages, ordering flow and info pages. "Done" means **ready to launch**: a real customer on a phone can browse, sign in, order and pay with no rough edges.

## Goals

- Every customer page looks finished and consistent at phone width (360–430px) first, and still good at tablet and desktop.
- Shared building blocks are fixed once and reused: section rhythm, headings and type scale, product cards, buttons, form fields, header, footer, empty and error states.
- The full purchase path works for real: browse → cart → sign in (email or Google) → Razorpay live → order placed → kitchen sees the order in the admin.
- WCAG 2.2 AA, 44px targets, `prefers-reduced-motion` respected, and the medical/allergy/diabetes/child-nutrition notice placed where `design.md` requires it.

## Non-goals

- No rebrand. Brand green + gold, Lora / Plus Jakarta Sans and the `design.md` tokens stay; changes refine within them.
- No admin UI work in this project (deferred by the user).
- No new features beyond what the existing specs cover. A missing feature found during the audit is built only if it blocks launch; the rest are listed.
- No live payment. Going live with Razorpay is left to the user.
- No guest checkout.

## Anti-goals (a failure even if it "works")

- Visual changes made by hard-coding copy or links that belong to the CMS (header/footer globals, product content).
- Pages that drift apart because the same fix was patched separately on each one.
- Health or nutrition claims, delivery areas or customer proof invented to fill space.
- `--gold-400` used as text on light backgrounds, multiple primary CTAs per section, or square buttons.

## Constraints

- Next.js version in this repo has breaking changes; read `node_modules/next/dist/docs/` before touching routing or data APIs.
- `docs/design/design.md` is the UI contract; `src/app/(frontend)/globals.css` holds the tokens.
- Customer identity is in `customers`, staff in `users`; separate cookies.
- Money is stored in paise, shown in rupees.
- Existing int and e2e tests must keep passing; changed behaviour updates its tests.

## Decisions made with the user

| Topic | Decision |
|---|---|
| Scope | Customer-facing site; all four areas |
| Problem | Mostly visual polish |
| Done | Ready to launch, verified end to end |
| Polish depth | Refine within the existing brand |
| Device | Mostly phone; mobile-first |
| Inputs on hand | Final copy and prices in CMS, real food photos, Razorpay live keys, Google OAuth credentials |
| Account rule | Sign-in required to buy; browsing and messaging stay open. `AGENTS.md` is updated to say so |
| Uncommitted WIP | Finish first: review, get tests green, commit, then build on it |
| Review medium | Browser review page with screenshots the user can annotate |
| Environment | Audit and polish locally against the dev database (Neon). The launch check includes deploying `deploy` to production (Dokploy, see `docs/deploy.md`) |
| Live payment | Not part of this project. Payments are verified in Razorpay **test mode** only; the user switches to live keys and registers the live webhook themselves. Google sign-in is driven with the real OAuth credentials |
| Launch blockers | A missing or broken feature that blocks launch (e.g. order email not sending, 404 broken) is built in this project after a quick confirmation. Nice-to-haves are only listed |

## Builder's calls (made while writing; the user can override)

- **Uncommitted WIP intent** comes from its own code and tests (`tests/int/product-kinds.int.spec.ts` and the edited int specs). Where intent is unclear, ask before committing; never revert new behaviour to old.
- **Review gating:** the ranked audit list waits for the user's notes. After that, only meaningful layout changes go to the review page before they're built; fixes for spacing, alignment, contrast or broken styles go straight in, and are shown afterwards as before/after shots.
- **Source of truth for copy:** the CMS content and the current product/combo model. `scope.md` and `PRODUCT.md` wording that still says "plans" is updated to match during stage 4.
- **Feedback channel:** annotations on the browser review page, which come back into this session.

## Approaches considered

- **A. Audit → shared system → pages → launch check (chosen).** One screenshot audit drives a ranked issue list; shared components are fixed once so every page benefits; then per-page passes in journey order; then live verification. Slower first visible change, but consistent and no duplicated fixes.
- **B. Page by page.** Fastest visible progress, but shared problems get patched per page and drift. Rejected because it works against "consistent and ready to launch".
- **C. System only.** Cheapest, but leaves page-specific layout problems. Rejected because it cannot reach "ready to launch".

## Plan of work (stages)

0. **Land the in-progress work.** Review the uncommitted product kinds / `normalizeProductShape` / `ProductGallery` / `ComboHealth` changes, run typecheck and tests, fix what is broken, commit on `deploy`.
1. **Audit.** Run the site with real CMS content, screenshot every customer route at 390px and 1280px (plus key states: empty cart, signed-out checkout, form errors, out-of-stock product). Publish a browser review page with the screenshots and a ranked issue list (severity, page, shared vs page-specific). The user annotates and confirms priorities.
2. **Shared system pass.** Fix the shared components the audit flags (section rhythm, type scale, cards, buttons, inputs, header and mobile menu, footer, notices, empty/error states). Update `design.md` where a spec changes.
3. **Page passes, journey order.** Home → products shelf and detail (incl. combos, gallery) → cart, checkout, order placed, account and auth → about, our kitchen, contact, blog, search, 404. Each page gets before/after screenshots in the review page.
4. **Launch check.** Place an order end to end in Razorpay test mode and confirm it in the admin and in the order email, drive a real Google sign-in, run the accessibility check (axe + keyboard), Lighthouse on phone for home and product detail, verify sitemap and metadata, reconcile `scope.md`, `PRODUCT.md` and `AGENTS.md` with what shipped, then deploy to production and smoke-test it. Hand the user a short checklist for switching to live Razorpay keys.

## Left to the builder

- Exact component changes, guided by the audit and `design.md`.
- Tooling for screenshots and accessibility checks.
- How to batch commits (one per stage or per page is fine).
- Which audit issues are trivial enough to fix without separate sign-off; anything that changes layout meaningfully goes through the review page first.
