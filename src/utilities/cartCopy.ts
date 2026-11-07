/**
 * The words the cart shares between the cards, the cart page and checkout
 * (spec 0007, AC-2, AC-3 and AC-4).
 */

export const CART_ADD_CTA = 'Add to cart'
export const CART_ADDING = 'Adding to cart'
export const CART_ADDED = 'Added to your cart.'
export const CART_ALREADY_IN = 'That product and duration is already in your cart.'
export const CART_FULL =
  'Your cart holds ten products. Remove one from the cart before adding another.'
export const CART_ADD_FAILED = 'That could not be added to your cart. Please try again.'

export const CART_LINK_LABEL = 'Cart'
export const CART_LINK_COUNT_ONE = '1 product in your cart'
export const CART_LINK_COUNT_MANY = 'products in your cart'

export const CART_PAGE_TITLE = 'Your cart'
export const CART_PAGE_HEADING = 'Your cart'
export const CART_PAGE_INTRO =
  'These are the products and durations you picked. Prices are read live, so what you see is what you pay.'
export const CART_PAGE_DESCRIPTION =
  'The products and durations in your basket, at their live prices, before one payment at checkout.'

export const CART_STALE_LABEL = 'No longer available'
export const CART_STALE_NOTE =
  'The marked products have changed or left the menu. Remove them to keep checking out; they are not included in the total.'
export const CART_REMOVE = 'Remove'
export const CART_TOTAL = 'Total'
export const CART_SUMMARY_HEADING = 'One payment'
export const CART_SUMMARY_BODY =
  'Prices are read from the kitchen\u2019s current menu, so what you see is what you pay. One payment covers the whole cart at checkout.'
export const CART_CHECKOUT_CTA = 'Go to checkout'
export const CART_KEEP_BROWSING = 'Keep browsing products'

export const CART_EMPTY_HEADING = 'Your cart is empty'
export const CART_EMPTY_BODY =
  'Add a product and a duration from the products page, and it will wait here for you.'
export const CART_EMPTY_CTA = 'Browse the products'

export const CART_NOTICE_DUPLICATE = CART_ALREADY_IN
export const CART_NOTICE_FULL = CART_FULL
export const CART_NOTICE_PAUSED =
  'That product is paused right now, so it cannot be added. Message the kitchen if you were hoping to start with it.'
export const CART_NOTICE_UNKNOWN =
  'That product is not on the menu any more. Pick another product from the products page.'
export const CART_NOTICE_CHANGED =
  'That duration has changed. Choose another duration on the products page.'
export const CART_NOTICE_GENERIC =
  'That could not be added to your cart. Please pick a product from the products page.'

export const CART_NOTICES: Record<string, string> = {
  changed: CART_NOTICE_CHANGED,
  duplicate: CART_NOTICE_DUPLICATE,
  full: CART_NOTICE_FULL,
  paused: CART_NOTICE_PAUSED,
  unknown: CART_NOTICE_UNKNOWN,
}

export const cartNotice = (code: null | string | undefined): null | string =>
  code ? (CART_NOTICES[code] ?? CART_NOTICE_GENERIC) : null
