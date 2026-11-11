# 0008. Plan category pages

**Date**: 2026-11-05
**Revised**: 2026-11-06, a subcategory layer is added: an admin managed option list per category, required on every plan, filtered on the category pages beside the audience. New criteria AC-8 to AC-10; the earlier criteria keep their numbers and their meaning.
**Revised**: 2026-11-06, the filter controls gain art: each audience pill carries an icon beside its label, and the subcategory controls become round image tiles, each fed by an optional image on the option. New criterion AC-11; AC-2, AC-8 and AC-10 keep their numbers and their meaning.
**Revised**: 2026-11-06, the subcategory filter row is withdrawn from the category pages, so the audience pills are each page's only filter; the subcategory data layer stays. AC-10 is withdrawn and AC-11 is narrowed to the audience pills.
**Revised**: 2026-11-11, the page's own audience pills are replaced by the shared shelf controls that `/products` also renders: search, filters (category and audience), a price range and a sort, all carried in the web address and read on the server, with numbered pages. AC-2 and AC-3 are revised, AC-11 is withdrawn (the pills lose their icons), and AC-12 to AC-15 are added. The store's plans were renamed products on 2026-11-07 (the rename landed across the codebase, the routes and the database), so this revision reads *plan* as *product* and `/plans` as `/products`, and writes the new criteria in the current names. A later cut of the same revision drops the Type and Section facets, so category and audience are the only filters the shelf offers.
**Status**: In Progress

## Summary

Each product category gets its own page: ready to cook, ready to eat, and fresh from produce, at web addresses like `/products/ready-to-cook`. The words on the page (headlines, intros) live in code, while the product cards on it come from the Products collection in the admin, the same split every existing page uses. Each page carries pills that filter the products by audience (All, Kids, Adults, Special), and the category labels on product cards become links to these pages. The 2026-11-06 revision adds a subcategory layer: the kitchen manages a list of finer labels per category in the admin and every product carries one. A second filter row for those labels was tried on the category pages and then withdrawn, so the audience pills carry the page's only filter. The same revision gives those pills art: each carries an icon beside its label; the 2026-11-11 revision withdraws the icons again (AC-11). The 2026-11-11 revision replaces those pills with the shared shelf controls `/products` also renders — search, filters, price, sort and numbered pages, all in the web address, so a filtered shelf is a link that survives a reload and a share. A later cut of that revision keeps the filters to category and audience, so the subcategory layer stays in the admin and on the products, read by no page filter.

## Context

Plans now carry two labels, a category (how the meal reaches the customer) and an audience (who it is for), but the site shows every plan in one flat shelf on `/plans`. A visitor who only wants ready to cook meals, or who is ordering for children, has to scan the whole shelf and mentally filter. Category pages give each group a focused shelf and a shareable web address.

Forces at play:

- The repo already splits content the same way everywhere: structured data lives in Payload collections the kitchen edits (Plans, Header, Footer), while page copy lives in code files (`homeCopy.ts`, `plansCopy.ts`, `aboutCopy.ts`). No existing page keeps its copy in the admin.
- There is no designer and no design tool connected; `docs/design/design.md` plus the built plans page already define every visual piece these pages need.
- Browsing stays open to everybody, no account and no hint of one (a hard rule in `AGENTS.md`).
- The kitchen is small; every admin surface added is surface somebody must maintain.

Not deciding means the labels stay inert text, the only browsing aid stays the one flat shelf, and sharing a link that shows only kid friendly ready to eat plans stays impossible.

## Requirements

**User stories**:

- As a visitor, I want a page that shows only one category of plans, so that I compare like with like.
- As a visitor, I want to narrow a category page to an audience (kids, adults, special), so that I find meals for my household.
- As the kitchen, I want the category labels on plan cards to lead to these pages, so that browsing by category needs no extra menu work from me.
- As the kitchen, I want to define and edit the subcategory list for each category in the admin, so that finer grouping never needs a developer.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: `/plans/ready-to-cook`, `/plans/ready-to-eat` and `/plans/fresh-from-produce` each render with a green opening band (the category name and a one line intro) and a grid of that category's plans. Open plans are buyable; paused plans render with the paused label and no buy action, and the paused plans notice renders whenever the category has paused plans, exactly as on `/plans`.
- **AC-2 (revised 2026-11-11)**: Each category page carries an audience filter with the choices All, Kids, Adults and Special, All by default — now one select of the shared shelf search bar rather than a row of client side pills. The select holds its value in the web address and the server re-renders the shelf on *Apply*, so the choice survives a reload and a share and works with JavaScript off. It leads with All, is named by a visible inline label and its `aria-label`, and keeps a 44px target. The icon per pill that AC-11 introduced is withdrawn (AC-11).
- **AC-3 (revised 2026-11-11)**: When a category has no products at all, the page shows the empty state card the products page uses: a heading, a line of copy, and the WhatsApp button when the footer carries a number. When the shelf holds products but the search or the filters match none, the same card shows with filter specific words and a *Clear all* action, so the copy never claims the shelf is empty when it is only filtered.
- **AC-4**: A category web address that is not one of the three category values renders the site group's not found page.
- **AC-5**: On `/plans` and on the home page, each plan card's category pill is a link to that category's page, with a distinct accessible name (for example "Browse ready to cook plans") and AA contrast in its green treatment. Each category page links to the other two category pages as a plain text link row under the grid.
- **AC-6**: Each category page carries its own title, description and canonical URL, and appears in the sitemap generated by the pages sitemap route.
- **AC-7**: A plan's slug can never equal one of the three category route slugs, so the address space under `/plans` never carries two meanings. The three category slugs are reserved; audience values take no route space and are not reserved.
- **AC-8**: A Subcategories collection grouped with the store content holds the option list: a title (the filter label) and exactly one category each (the same three values the Plans category select uses), identified by the document id (no slug field: nothing public reads one, and two categories may each carry a same named option). Staff manage the list entirely in the admin, and a plan's subcategory picker offers only the subcategories of the plan's own category.
- **AC-9**: Every plan carries exactly one subcategory from its own category, required with no default: creating or editing a plan without one is refused, and a plan whose subcategory belongs to a different category is refused on save. A subcategory that plans still use cannot be deleted; staff reassign those plans first. The three plans that existed before this revision stay unassigned until staff assign them in the admin, and the migration that adds the field touches no existing row.
- **AC-10 (withdrawn 2026-11-06)**: A second filter row for subcategories briefly followed AC-11 on the category pages. It is withdrawn: the pages carry the audience filter only, and the subcategory layer stays in the admin and on the plans, read by no page filter.
- **AC-11 (withdrawn 2026-11-11)**: Each audience pill carried art: an icon drawn from code shipped with the site (one per audience, plus All), shown beside its label. The icons are withdrawn with the client side pills: the shelf's four facets are one pill language, and giving one facet art while the rest go plain read as an accident. The pills never carried art in their accessible name, so nothing about naming changes.
- **AC-12**: `/products` and each category page render the same shelf: one search field, filters (category and audience), a price range and a sort, with the state carried in the web address (`?q=&category=&audience=&from=&to=&sort=&page=`). Every view is a real server rendered query: it is shareable, bookmarkable, reloadable and works with JavaScript off. An unrecognised value is dropped rather than raising an error, and any change other than the page number returns the shelf to page one.
- **AC-13**: The shelf holds twelve products to a page and pages with numbered links that keep the filters in force; a page past the end renders the last real page rather than an empty shelf. Price filtering and price sorting read one stored number per product, the lead price the card shows, kept in paise on `products.fromPrice` by a save hook, so the filter, the sort and the card can never disagree.
- **AC-14**: The shelf's controls are one slim search bar above the grid, not a card: each facet is a labelled select that leads with All, and the search, the price range, the sort and the two actions share the one plain `GET` form, so every parameter has exactly one home and applying a choice never drops another. One primary action (*Apply*) submits the form and a quiet *Clear all* returns to the bare shelf. A quiet line above the grid says how many products the page is showing.
- **AC-15**: A category page pins its own category: it is not offered as a facet there and the address can never widen the shelf past the page it is on. A searched or filtered shelf is kept out of the index (`noindex, follow`) with its canonical on the clean shelf, so filtering never multiplies indexable pages; paging is left indexable.

## Options considered

### Option 1: Code copy with one dynamic route (chosen)

One Next.js route (`/plans/[category]`) reads the category from the web address, pulls that category's plans from the Plans collection through Payload's local API, and takes its words from a new code file next to `plansCopy.ts`. The three categories are fixed values of the select field, so the route accepts exactly three slugs.

**Pros**:
- Matches the established split in the repo: copy in code, data in the admin
- One file to build and style, three pages for free; no new admin surface
- Copy changes go through git, so they are reviewed and versioned like the rest of the site

**Cons**:
- The kitchen cannot reword a category page without a developer and a deploy

### Option 2: Fully CMS managed category pages

A new Payload collection (or global per category) holds each category page's headline, intro and photo; staff edit them in the admin.

**Pros**:
- Copy changes need no deploy and no developer

**Cons**:
- A whole new admin surface to build, style, and keep on brand (the admin is a branded surface by rule, so every field carries styling weight)
- Two homes for one story: the category value lives on the plan, the category page copy lives elsewhere, and they can drift
- The kitchen's real editing need, prices and availability, is already covered by Plans

### Option 3: Static pages, one per category

Three hand written page files, each with its own copy and its own grid query.

**Pros**:
- Zero indirection; each page is plain to read

**Cons**:
- Three copies of the same layout and query logic to keep in step
- Adding a fourth category means a fourth page; the select field already makes that a data change, so code would lag behind data

## Decision

**Chosen option**: Option 1: Code copy with one dynamic route

One dynamic route serves all three category pages, with copy from a shared code module and plan data from the CMS. The pages render force-dynamic like `/plans`, so live prices and paused states are always current. The `/plans` page itself stays unchanged except that badges become links. The 2026-11-06 revision extends this same option with a subcategory layer: a new admin managed collection and a second client side filter row; the single dynamic route, the code copy and the reserved slugs are unchanged. The 2026-11-11 revision replaces the page's own client side pills with the shared, server rendered product shelf that `/products` also renders (a shared engine, `src/utilities/productShelf.ts`, and its controls); the single dynamic route, the code copy and the reserved slugs are still unchanged.

**Implementation skills**: none used for this design (the project's own `design.md` and existing page patterns were the authority)

## Rationale

The engineer's core question was Payload CMS or code. The deciding force is precedent plus maintenance weight: every page in this repo keeps its copy in code and only records in the admin, so a CMS managed category page would be the first of its kind, carrying new admin styling and a second home for category truth. The kitchen edits plan prices and availability constantly (that is what Plans is for), but category page words change rarely, and when they do, a developer is already involved in most site changes. Option 2 would buy copy independence that nobody has asked for, at the cost of a new surface to keep on brand. The runner up is the hybrid (code defaults, admin overrides), and it stays the natural next step if the kitchen starts asking to reword these pages often.

The audience filter is client side pills rather than separate audience URLs because search engines do not need six near identical pages and the pills keep the address space and the sitemap honest: one page per category, three in total. (Revised 2026-11-11: the filter now lives in the web address so a filtered shelf is linkable and reloadable. The indexability the old reasoning protected is kept instead by `noindex, follow` on any searched or filtered view, with the canonical on the clean shelf, so the catalogue never multiplies into near identical indexable pages.)

## Feature design

**Data model sketch**:

One guarded migration (the build plan sizes it). The feature reads what exists:

- `plans.category`: required select, values `ready-to-cook`, `ready-to-eat`, `fresh-from-produce` (added in spec 0007's follow up work, in the database via migration `20261105_170000_plan_category_audience`)
- `plans.audience`: required select, values `kids`, `adults`, `special`
- `plans.available`: checkbox controlling the paused state

The 2026-11-06 revision adds:

- `subcategories` (new Payload collection, staff write, public read): `title` text required (the filter label) and `category` select required carrying the same three values the Plans category select uses; the document id is the identity (no slug field)
- `plans.subcategory`: a new relation to `subcategories`, required in admin validation with no default; the column is added nullable so the migration never touches existing rows, and validation enforces the requirement from deployment on

The route's single input, the category slug, must be one of the three category values. Display labels (for example "Fresh from produce") live in the copy module, keyed by value, shared with the plan card badges so the two never drift apart.

**API surface**: no new endpoints or server actions. The pages are server components reading through Payload's local API, the same path the plans page uses.

| Surface | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/plans/[category]` (page) | GET | category: route param | rendered page | public | 404 for any slug outside the three values |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Render opening band | Eyebrow, headline, accent phrase, intro line | Copy module, keyed by category slug (new code file) |
| Render plan grid | Plan cards for the category | `plans` rows filtered by `category` (DB column) |
| Paused label on a card | Paused pill and no buy panel | `plans.available` (DB column) |
| Shelf facets and the search form | The facet selects, the search field, the price range, the sort | Copy module for the words and the option labels; values read from the `products` columns (category, audience, the stored lead price) |
| Filtered, sorted, paged grid | One page of cards matching the address's state | `products` rows filtered, sorted and paged server side through `src/utilities/productShelf.ts` |
| Lead price on a card and in the price control | *From ₹X a day*, and the numbers the price filter and price sort read | `products.fromPrice` in paise, written on save by the lead price hook (`src/utilities/leadPrice.ts`) |
| Numbered pages | Page links that keep the filters in force | Derived from the filtered count and `?page=` |
| Empty state card | Heading, copy, WhatsApp CTA | Copy module for words; `footer.contact.whatsapp` global for the number (same source the plans page uses) |
| Page metadata | Title, description, canonical URL | Copy module; canonical derived from the category slug |
| Sitemap entry | One URL per category page | The three category values, added to `defaultSitemap` in `src/app/(frontend)/(sitemaps)/pages-sitemap.xml/route.ts` |
| Category links on badges | Link target and accessible name for each pill | Derived from `plans.category` value through the shared route map; accessible name from the copy module |
| Category page cross links | Links to the other two categories | Copy module (the three known values) |

**Key invariants**:

- The route accepts exactly the three category values; any other slug renders not found, through the site group's not found page
- A plan slug is unique (already enforced) and must not equal any category route value, enforced by validation on the Plans collection's slug field: a lowercase comparison against the reserved set, run on create and update, with the admin form error as the way a collision surfaces
- The audience filter never changes the URL and never triggers a server round trip (revised 2026-11-11: the shelf's state lives in the web address and the server renders it, so a filtered view is a link; the parameter names are a fixed set and each reads a column the collection already carries)
- The lead price is computed in one place (`src/utilities/leadPrice.ts`), stored on the product by a `beforeChange` hook, and read by the card, the price filter and the price sort, so the three cannot drift
- A category page's address can never widen the shelf: the category is pinned server side, never offered as a facet there
- The label map for badges and the copy module draw from one shared source, so a label never says one thing on a card and another on its page
- `PlanCard` stays a server component (it holds rich text and the purchase form). The client side filter receives an id to audience map and toggles card visibility only; cards never hydrate
- The category route owns the `/plans/<segment>` slot. A future plan detail page must live under a different prefix (for example `/plan/<slug>`); checkout is unaffected because plan slugs travel as query parameters, not path segments

The revision adds these invariants:

- A plan's subcategory always belongs to the plan's category: the save validation refuses a mismatched pair, so a card can never be offered under a category its subcategory does not serve
- A subcategory that plans still use cannot be deleted; staff reassign the plans first
- The filter art never reaches the accessible name: the audience icons are decorative, and every pill is named by its visible label (moot 2026-11-11: the icons are withdrawn)

**Security model**:

Public read, no accounts, no personal data on these pages. Plans are already readable by anyone; writes stay staff only through the existing Plans collection access. The `subcategories` collection is public read (the pages need the option labels) and staff only write, matching Plans. No compliance scope is triggered (no payments, no health data on these pages; any health adjacent copy on a card still carries the notice block required by `design.md`, which is the card's job, not this page's).

**Critical test scenarios** (each maps to an acceptance criterion in `## Requirements`):

- Happy path: open `/products/ready-to-cook`, see only that category's products, then add `?audience=kids` and reload to see only kid products in that category, verifies **AC-1**, **AC-2**
- Failure case: open `/products/lunch-plan` (a product slug, not a category) and receive the product's own page, verifies **AC-4**
- Empty case: open a category whose every product is paused and see the paused cards, the paused notice and no buy action; filter to a combination with no cards and see the filter specific empty card with the WhatsApp button and *Clear all*, verifies **AC-3**
- Accessibility: tab through the shelf's facets and its form, choose a facet and reach the new view by keyboard, verifies **AC-12**, **AC-14**
- Subcategory case: creating or editing a product with no subcategory is refused, verifies **AC-9**
- Admin/permission: a product saved with a subcategory from another category is refused; deleting a subcategory that products use is denied, verifies **AC-9**
- Shelf case: `?q=lunch` narrows the shelf, `?from=50&to=250` bounds it by the stored lead price, `?sort=price-asc` orders it, and `?page=99` renders the last real page, verifies **AC-12**, **AC-13**
- Category boundary: a category page carries no category facet, and its address can never widen the shelf past the page, verifies **AC-15**

## Build plan

No build approach is recorded for this feature, so the default applies: one end to end slice, which this small feature naturally is. No migration is needed (the schema change already shipped in migration `20261105_170000_plan_category_audience`).

1. Create the shared category module: route values, display labels, per category copy (eyebrow, headline, accent, intro, metadata), the filter specific empty line, and the route map badges use, satisfies **AC-1**, **AC-5**, **AC-6**
2. Reserve the three category slugs in the Plans collection's slug field validation (lowercase comparison, create and update; audience values are not reserved), satisfies **AC-7**
3. Build the dynamic route `/plans/[category]`, force-dynamic, with the opening band and the server rendered grid, reusing `PlanCard` and the `Section` band patterns from the plans page, and unknown slugs rendering the site group's not found page, satisfies **AC-1**, **AC-4**
4. Build the audience filter pills as a small client component that toggles card visibility (labelled group, pressed state, 44px targets, live region, no motion), satisfies **AC-2**
5. Wire the empty state card (with the filter specific line), the paused plans notice and the final call to action section, reusing the plans page's components and copy patterns, satisfies **AC-3**
6. Turn the category pill on `PlanCard` into a link with an accessible name, add the cross link row under the grid, and add the three category URLs to `defaultSitemap` in `src/app/(frontend)/(sitemaps)/pages-sitemap.xml/route.ts`, satisfies **AC-5**, **AC-6**

Revision tasks (2026-11-06, the subcategory layer), one guarded migration that creates the `subcategories` table and adds `plans.subcategory_id` nullable, with no backfill and no destructive statement (dev gets the schema by push, production by the compose migrate service):

7. Create the `subcategories` collection: title, category select, store grouping, staff only write and public read, satisfies **AC-8**
8. Add `plans.subcategory`: the relation with `filterOptions` limited to the plan's own category, the required with no default validation, the category match validation on save, the delete denial, and the guarded migration, satisfies **AC-9**
9. (withdrawn 2026-11-06) Extend the category page filter to two rows: fetch the category's subcategories server side, render the alphabetical pills only when options exist, combine the two filters client side, keep the empty state unchanged, and pass the id to label map to the client component, satisfies **AC-10**
10. Tests and typecheck: the collection and validation rules, the legacy plan matching only All, and the delete denial, satisfies **AC-8**, **AC-9**

Revision task (2026-11-06, the filter art), no migration (the audience icons are code):

11. Give the audience pills their art: an icon per pill, plus the tests that pin the accessible names, satisfies **AC-11**

Revision tasks (2026-11-11, the shared product shelf), one guarded migration that adds `products.from_price` (nullable, indexed) with a backfill over existing rows and nothing destructive (dev gets the schema by push, production by the compose migrate service):

12. Add `products.fromPrice`: the stored lead price in paise, its single owner `src/utilities/leadPrice.ts`, the `beforeChange` hook that keeps it in step, the card reading it with the function as fallback, and the guarded migration with its backfill, satisfies **AC-13**
13. Build the shared shelf engine `src/utilities/productShelf.ts`: the state parser, the `where` builder, the href builder and the paged fetch, satisfies **AC-12**, **AC-13**, **AC-15**
14. Build the shelf's controls and its rendered section once (`ProductShelfControls`, `ProductShelf`) and render them on `/products` and on every category page, with the category pinned on the category pages, satisfies **AC-12**, **AC-14**, **AC-15**
15. Tests and typecheck: the state parser, the hrefs, the `where` builder, both surfaces' render, and the category copy suite, satisfies **AC-12** to **AC-15**

## Consequences

**Positive**:
- Each category gets a focused, shareable shelf without any new admin surface
- The category labels become navigation, so the two label fields start earning their keep
- Adding a fourth category later is a copy entry and a select option, not a new page build

**Negative / tradeoffs**:
- Category page words change only through a code change and a deploy
- The address space under `/plans` now splits between the shelf and three reserved category slugs, a rule future plan slugs must respect
- A refreshed or shared filtered view always lands back on All, because the filter is deliberately not in the web address; nobody should later "fix" this with query parameters, which would create six near identical indexable variants. (Revised 2026-11-11: the state now lives in the web address, so a filtered or shared view keeps its filters. The old worry — that query parameters would create dozens of near identical indexable variants — is answered by keeping searched and filtered views out of the index (`noindex, follow`, canonical on the clean shelf) rather than by refusing the parameters.)

**Neutral**:
- The sitemap grows by three URLs
- `/plans` keeps its current look; only the badges on cards change (from plain text to links)
- Header and footer category links, if wanted, are admin work in Site chrome, not code

**Added by the 2026-11-06 revision**:

Positive:
- Finer grouping needs no developer: the kitchen owns the option list, per category
- The filter stays client side, so the address space and the sitemap stay honest: still three pages (reversed 2026-11-11: the shelf is server rendered and its state lives in the address, kept out of the index by `noindex, follow`)

Negative / tradeoffs:
- The subcategory layer now has no page that reads it, so it serves the kitchen's own labels until it earns a surface
- A second filter row was tried and withdrawn, churn the audience pills now avoid

Neutral:
- One guarded migration (a new table plus a nullable column); no backfill, nothing destructive

**Added by the 2026-11-11 revision**:

Positive:
- A searched, filtered or sorted shelf is a real link: shareable, bookmarkable, reloadable, and working with JavaScript off
- One shelf serves `/products` and every category page, so the storefront browses the same way everywhere
- The lead price the card shows is stored once, so the price filter, the price sort and the card cannot disagree

Negative / tradeoffs:
- The parameter names are now part of the public surface; renaming one is a breaking change
- A searched or filtered view is deliberately kept out of the index, so those views earn no search traffic of their own
- A product with no computable lead price (impossible through the admin, since a price is required) would lead a dearest-first sort and sit outside both ends of a price range; none exists in a valid catalogue

Neutral:
- One guarded migration (a nullable indexed column plus a backfill); nothing destructive
- The shelf renders server side, so each change reloads the page rather than filtering in the browser

## Follow-up

- [x] Enroll a scope feature row for this feature (done: scope row 5, Plan category pages)
- [ ] The kitchen can add category links to the header or footer themselves in the admin under Site chrome; no code needed, and not part of this build
- [ ] The three existing plans carry placeholder labels (ready to eat, adults) from the backfill; the kitchen should correct them in the admin, especially `kids-plan`
- [ ] If the kitchen later wants to reword category pages themselves, revisit the hybrid option (code defaults, admin overrides)
- [ ] Staff assign subcategories to the three existing plans in the admin, alongside the placeholder label fixes they already owe
- [ ] If subcategory pages or card badges are wanted later, design them then: routes under a category would need reserved slugs and sitemap entries, and badges would add a third label to the cards
- [ ] A database managed by dev push gets the `from_price` column but not the migration's backfill; after the column arrives, run `npx payload run ./src/scripts/backfill-lead-price.ts` once, or the price filter looks broken until every product is saved by hand (production gets the backfill from the migration)
- [ ] The shelf's search matches a product's title and points only: the description is a `jsonb` rich text column a simple query cannot pattern match. If search over descriptions is wanted later, design it then (a generated search column, or Postgres full text search)
