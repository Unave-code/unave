/**
 * The words on a product's own page.
 *
 * The card is a door: a photo, the name and the first duration's price, and the
 * whole card links here, where the durations, the price panel and the add to
 * cart control live. Only these labels are code; the product itself is CMS data,
 * like every other product field.
 */

/** The breadcrumb back to the whole shelf. */
export const PRODUCT_BACK_LABEL = 'All products'

/** The heading over the check-marked points, when a product has any. */
export const PRODUCT_POINTS_HEADING = 'What you get'

/** The quiet line under a paused product's durations, where nothing can be added. */
export const PRODUCT_PAUSED_INLINE =
  'This product is paused right now. Message the kitchen if you were counting on it.'

/** The meta description for a product's page, built from its own title. */
export const productPageDescription = (title: string): string =>
  `${title} from the UNAVE kitchen. Choose how long it runs, add it to your cart and pay once; we cook it and deliver to your door.`
