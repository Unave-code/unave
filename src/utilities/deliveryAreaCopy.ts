/**
 * The words the delivery areas page, the contact page, checkout and the order
 * endpoint share, so the refusal a customer reads is the same everywhere.
 */

export const DELIVERY_AREAS_PATH = '/delivery-areas'

/** Primary query: "food delivery areas Chennai" (docs/seo/keyword-map.md). */
export const DELIVERY_AREAS_PAGE_TITLE = 'Delivery Areas in Chennai'
export const DELIVERY_AREAS_PAGE_DESCRIPTION =
  'The areas of Chennai the UNAVE cloud kitchen delivers to. Check your pincode, or message us on WhatsApp to ask about yours.'

export const DELIVERY_AREAS_EYEBROW = 'Delivery areas in Chennai'
export const DELIVERY_AREAS_HEADLINE = 'Where we'
export const DELIVERY_AREAS_HEADLINE_ACCENT = 'deliver'
export const DELIVERY_AREAS_INTRO_FALLBACK =
  'We cook in Chennai and deliver to the areas below. Check your pincode to be sure.'

export const DELIVERY_STAT_AREAS = (count: number): string => `${count} area${count === 1 ? '' : 's'}`
export const DELIVERY_STAT_PINCODES = (count: number): string => `${count} pincode${count === 1 ? '' : 's'}`

export const DELIVERY_LIST_INTRO = 'Every area the kitchen delivers to, with its pincodes. Choose one to see it on the map.'

export const DELIVERY_MAP_LABEL = 'Map of the areas we deliver to'
export const DELIVERY_MAP_KITCHEN = 'UNAVE kitchen'
export const DELIVERY_MAP_SHOW = 'Show on map'
export const DELIVERY_MAP_SHOWN = 'On the map'
export const DELIVERY_MAP_EMPTY = 'We couldn’t place the areas on the map just now. The list below holds every area we deliver to.'

/** The band photo behind the green opening band; decorative, so no alt text. */
export const DELIVERY_AREAS_HERO_IMAGE = '/images/hero-table.jpg'

export const DELIVERY_PHOTOS_HEADING = 'From our kitchen to your door'
export const DELIVERY_PHOTOS_INTRO = 'Every order is cooked and packed in our Chennai kitchen, then brought to the areas above.'

/** Shown until staff add their own photos under Website → Delivery areas. */
export const DELIVERY_PHOTOS_FALLBACK = [
  { alt: 'Two cooks tasting a dish together at a kitchen counter', caption: '', src: '/images/kitchen.jpg' },
  { alt: 'A spinach, avocado and pomegranate salad on a patterned plate', caption: '', src: '/images/gallery-2.jpg' },
  { alt: 'Three plated dishes with fresh herbs, chillies and cashews on a wooden table', caption: '', src: '/images/hero-table.jpg' },
] as const

export const DELIVERY_FINAL_HEADING = 'Not on the list yet?'
export const DELIVERY_FINAL_BODY =
  'We add areas as the kitchen grows. Message us your pincode and we’ll tell you honestly whether we can reach you.'
export const DELIVERY_FINAL_SECONDARY = 'Contact us'

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

/** The alert checkout opens when it refuses a pincode. */
export const PINCODE_DIALOG_HEADING = 'We don’t deliver there yet'
export const PINCODE_DIALOG_BODY = (pincode: string): string =>
  pincode
    ? `Our delivery areas don’t cover ${pincode} yet. Message or call the kitchen and we’ll tell you what we can do.`
    : 'Our delivery areas don’t cover this pincode yet. Message or call the kitchen and we’ll tell you what we can do.'
export const PINCODE_DIALOG_CLOSE = 'Close'
export const PINCODE_DIALOG_AREAS_LINK = 'See our delivery areas'

/** Under the pincode on the account form: a profile is not an order, so it only warns. */
export const PROFILE_PINCODE_NOT_SERVED =
  'We don’t deliver to this pincode yet, so checkout will not accept it. You can still save it.'

export const CONTACT_AREAS_HEADING = 'Where we deliver'
export const CONTACT_AREAS_LINK = 'See all delivery areas'
