/**
 * The words the delivery areas page, the contact page, checkout and the order
 * endpoint share, so the refusal a customer reads is the same everywhere.
 */

export const DELIVERY_AREAS_PATH = '/delivery-areas'

/** Primary query: "food delivery areas Chennai" (docs/seo/keyword-map.md). */
export const DELIVERY_AREAS_PAGE_TITLE = 'Delivery Areas in Chennai'
export const DELIVERY_AREAS_PAGE_DESCRIPTION =
  'The areas of Chennai the UNAVE cloud kitchen delivers to. Check your pincode, or message us on WhatsApp to ask about yours.'

export const DELIVERY_AREAS_EYEBROW = 'Delivery areas'
export const DELIVERY_AREAS_HEADLINE = 'Where we deliver'

export const DELIVERY_CHECK_HEADING = 'Check your pincode'
export const DELIVERY_CHECK_LABEL = 'Pincode'
export const DELIVERY_CHECK_CTA = 'Check pincode'
export const DELIVERY_CHECK_INVALID = 'Enter a 6 digit pincode.'

export const DELIVERY_LIST_HEADING = 'Areas we deliver to'
export const DELIVERY_LIST_EMPTY =
  'We are putting the list of areas together. Message us on WhatsApp and we will tell you whether we reach you.'

export const DELIVERY_SERVED = (area: string, pincode: string): string =>
  `Good news: we deliver to ${pincode} (${area}).`

export const DELIVERY_NOT_SERVED = (pincode: string): string =>
  `We don’t deliver to ${pincode} yet. Message us on WhatsApp and we’ll tell you when we do.`

/** When the check is off or the list is empty, a looked-up pincode gets an honest answer, not a guess. */
export const DELIVERY_UNCHECKED = (pincode: string): string =>
  `We can’t confirm ${pincode} from this page yet. Message us on WhatsApp and we’ll tell you.`

/** What the order endpoint and the checkout form show for a pincode outside the areas. */
export const CHECKOUT_PINCODE_NOT_SERVED =
  'We don’t deliver to this pincode yet. See our delivery areas, or message us on WhatsApp.'

/** Under the pincode on the account form: a profile is not an order, so it only warns. */
export const PROFILE_PINCODE_NOT_SERVED =
  'We don’t deliver to this pincode yet, so checkout will not accept it. You can still save it.'

export const CONTACT_AREAS_HEADING = 'Where we deliver'
export const CONTACT_AREAS_LINK = 'See all delivery areas'
