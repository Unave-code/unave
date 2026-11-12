# 0009 · Subcategory query filter

**Status**: Assumed
**Date**: 2026-11-12
**Authorized by**: user, during /develop

## Owed decision
Whether subcategory links should open dedicated pages or filter the existing category shelf, and how the filter should participate in shelf navigation.

## Assumption built on
Subcategory tiles link to the matching category page with `?subcategory=<slug>`. The server resolves the slug and filters by the subcategory document ID. The filter remains hidden from the shelf controls, is preserved by pagination and other filter submissions, and an unknown slug returns no products rather than widening the shelf.

## Code area
`src/components/home/Products.tsx`, `src/app/(frontend)/(site)/products/[slug]/page.tsx`, `src/components/Store/ProductShelf.tsx`, `src/components/Store/ProductShelfControls.tsx`, `src/utilities/productShelf.ts`, `src/utilities/products.ts`, `src/collections/Subcategories/`, `src/migrations/`, `docs/design/design.md`, and focused tests.

## Requirements
Make home subcategory tiles clickable using their slugs. A click opens the corresponding category shelf with products from only that subcategory. Persist a required unique slug for every subcategory, backfilling existing rows deterministically before enforcing the constraint. Keep the result server rendered, shareable, reloadable, paginated, and compatible with the existing shelf controls.

## Ratify
This decision was recorded by /develop, not deliberated. Run `/architect subcategory query filter` to deliberate and ratify it. Until then it stays flagged as an owed decision; it does not block marking the feature `done`.
