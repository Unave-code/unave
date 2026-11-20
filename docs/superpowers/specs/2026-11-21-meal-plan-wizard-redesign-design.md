# Meal plan wizard redesign

Short design, approved 2026-11-21.

## Intent

The meal plan page (`/meal-subscription/<slug>`) should open straight onto the
builder and look like the rest of the shop (cart, checkout, product page), not
like a separate design. The list page at `/meal-subscription` and its cards stay
as they are.

## Goals

- No content block above the wizard: drop the hero photo, "Meal plan" chip,
  "From ₹…" price, delivery-times list and "Build your plan" button.
- Reuse the shop's own pieces so the wizard reads as part of checkout:
  `CheckoutSteps`-style step strip, white `bg-card rounded-2xl shadow-sm` cards,
  shared `Cta` pills, the product page's option tiles, the shop quantity
  stepper look, and a summary card styled like the cart summary.

## Non-goals

- No change to the list page, the cards, prices, the cart form (`/api/cart/plan`),
  pricing rules, or the admin.
- No change to the three steps (Plan, Menu, Options) or their order.

## Anti-goals

- Losing anything the current builder does: keyboard focus moving to each step
  heading, locked later steps until the plan is valid, Edit links in the
  summary, the WhatsApp "Ask us first" link, the mobile pinned total, the
  "Plans open soon" empty state, the 44px minimum targets and reduced motion.

## Approaches

1. **Restyle in place with the shop's components (chosen).** Keeps the layout
   the user asked to keep and gives consistency for free.
2. One long scrolling form instead of steps. Rejected: changes the layout.
3. Merge the plan choice into the wizard on `/meal-subscription`. Rejected: the
   user wants the list page and per-plan pages kept.

## Design

Top to bottom on the plan page:

1. Small breadcrumb: Meal plans › <plan title>.
2. Page header like `StorePageHeader`: "Build your <title>" as the h1, the
   plan's description (or a one-line default) as the intro.
3. Step strip in the `CheckoutSteps` look (gold current dot, green checked done
   steps that are clickable, grey later steps, disabled until valid).
4. Two columns from `lg`: the step card (white, soft shadow) and the pinned
   summary card. Step card holds the step heading, the step body, then Back /
   Next as shared pill buttons.
   - Plan step: meals, length and options as product-page option tiles (green
     outline pill, solid green with gold check when chosen); people as the shop
     quantity stepper.
   - Menu step: the same table, in the shop's card and border styling.
   - Options step: option tiles per group.
5. Summary card styled like the cart summary: rows with Edit links, price lines,
   Total, the Add to cart pill, the secure-payment line, the WhatsApp link.
6. Phones: the pinned bottom bar stays, restyled to match.

## Left to the builder

Exact spacing and class choices within the design system (`docs/design/design.md`),
whether to extend `CheckoutSteps` or add a sibling component, and tile markup
reuse from `OptionTiles` where the radio semantics fit.
