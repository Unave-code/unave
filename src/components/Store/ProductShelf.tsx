import { Cta } from '@/components/Cta'
import { Notice } from '@/components/Notice'
import { Pagination } from '@/components/Pagination'
import { ProductCard } from '@/components/Store/ProductCard'
import { ProductShelfControls } from '@/components/Store/ProductShelfControls'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import type { ProductCategoryValue } from '@/utilities/productsCategoryCopy'
import {
  SHELF_PER_PAGE,
  EMPTY_SHELF,
  hasShelfFilters,
  shelfHref,
  type ShelfResult,
  type ShelfState,
} from '@/utilities/productShelf'
import {
  PRODUCTS_CTA_MESSAGE,
  PRODUCTS_EMPTY_BODY,
  PRODUCTS_EMPTY_HEADING,
  PRODUCTS_PAUSED_NOTE_BODY,
  PRODUCTS_PAUSED_NOTE_TITLE,
  SHELF_CLEAR,
  SHELF_EMPTY_BODY,
  SHELF_EMPTY_HEADING,
  shelfResultsLine,
} from '@/utilities/productsCopy'
import { whatsappHref } from '@/utilities/whatsapp'

/**
 * The shelf itself: controls, grid, words and pages (design.md §6.19).
 *
 * `/products` and the three category pages render through here, so a filter, a
 * sort, a page length and an empty state behave the same on all four. The
 * grid is server rendered from a real database query, and the pagination is
 * ordinary links carrying the current filters, so every page of every filtered
 * shelf has its own address.
 *
 * Two empty states, so the words never lie (spec 0008, AC-3): one when the
 * filters matched nothing — the shelf is not empty, the question was — and one
 * when the shelf genuinely has nothing to show.
 */
export const ProductShelf: React.FC<{
  basePath: string
  /** Set on a category page, where the category is the page and not a filter. */
  category?: ProductCategoryValue
  result: ShelfResult
  state: ShelfState
  whatsapp: null | string
}> = ({ basePath, category, result, state, whatsapp }) => {
  const filtered = hasShelfFilters(state, category)
  const pausedOnPage = result.docs.some((product) => !product.available)

  const first = result.totalDocs === 0 ? 0 : (result.page - 1) * SHELF_PER_PAGE + 1
  const last = Math.min(result.page * SHELF_PER_PAGE, result.totalDocs)

  return (
    <div>
      <ProductShelfControls
        basePath={basePath}
        fixedCategory={category}
        state={state}
      />

      {result.docs.length > 0 ? (
        <>
          <p className="text-ink-600 mt-6 text-sm font-semibold">
            {shelfResultsLine(first, last, result.totalDocs)}
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {result.docs.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                returnPath={shelfHref(basePath, state)}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="border-line mx-auto mt-8 max-w-[52ch] rounded-2xl border p-8 text-center">
          <h3 className="text-h3">{filtered ? SHELF_EMPTY_HEADING : PRODUCTS_EMPTY_HEADING}</h3>

          <p className="text-body text-ink-600 mt-3">
            {filtered ? SHELF_EMPTY_BODY : PRODUCTS_EMPTY_BODY}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {filtered ? (
              <Cta href={shelfHref(basePath, EMPTY_SHELF)} variant="secondary">
                {SHELF_CLEAR}
              </Cta>
            ) : null}

            {whatsapp ? (
              <Cta
                href={whatsappHref(whatsapp)}
                rel="noopener noreferrer"
                target="_blank"
                variant="primary"
              >
                <WhatsAppIcon className="size-4" />
                {PRODUCTS_CTA_MESSAGE}
              </Cta>
            ) : null}
          </div>
        </div>
      )}

      <Pagination
        hrefFor={(page) => shelfHref(basePath, state, { page })}
        page={result.page}
        totalPages={result.totalPages}
      />

      {pausedOnPage ? (
        <Notice className="mt-10 max-w-[70ch]" title={PRODUCTS_PAUSED_NOTE_TITLE}>
          {PRODUCTS_PAUSED_NOTE_BODY}
        </Notice>
      ) : null}
    </div>
  )
}
