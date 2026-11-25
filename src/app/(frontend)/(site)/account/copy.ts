/** Fixed strings for the account page. */

export const ACCOUNT_TITLE = 'Your account'

export const ACCOUNT_INTRO = 'Your details, in one place, and how to reach the kitchen.'

export const ACCOUNT_SIGN_OUT_HINT =
  'Use Sign out in the menu at the top of the page when you are done.'

export const ACCOUNT_SESSION_EXPIRED = 'Your sign-in expired. Please sign in again.'

export const ACCOUNT_NOT_GIVEN = 'Not given'

export const ACCOUNT_DETAILS_HEADING = 'Account details'

/** The three views the account page switches between, chosen by `?tab=`. */
export const ACCOUNT_TABS_LABEL = 'Account sections'

export const ACCOUNT_TAB_DETAILS = 'Details'

export const ACCOUNT_TAB_DELIVERY = 'Delivery'

export const ACCOUNT_TAB_ORDERS = 'Orders'

export const ACCOUNT_DETAILS_INTRO = 'The details we use to reach you.'

export const ACCOUNT_NAME_LABEL = 'Name'

export const ACCOUNT_EMAIL_LABEL = 'Email'

export const ACCOUNT_MEMBER_SINCE_LABEL = 'Member since'

export const ACCOUNT_SIGN_IN_LABEL = 'Sign in with'

export const ACCOUNT_SIGN_IN_PASSWORD = 'Email and password'

export const ACCOUNT_SIGN_IN_GOOGLE = 'Google'

export const ACCOUNT_SET_PASSWORD_HINT =
  'You signed in with Google, so you do not have a password yet. Use Forgot your password on the sign in page to set one.'

export const ACCOUNT_HELP_HEADING = 'Need a hand?'

export const ACCOUNT_HELP_INTRO =
  'Questions about a delivery, an order or a change? Message us and we will sort it out.'

export const ACCOUNT_HELP_ABOUT = 'About the kitchen'

export const ACCOUNT_HELP_CONTACT = 'Message us'

/**
 * The delivery details the customer saves on this page.
 *
 * Address and phone are required here even though the profile as a whole is
 * optional: a customer who saves gives us the whole delivery set, never half an
 * address.
 */
export const ACCOUNT_DELIVERY_HEADING = 'Delivery details'

export const ACCOUNT_DELIVERY_INTRO =
  'Where we bring your meals, and how to reach you when the kitchen is in touch.'

/**
 * The onboarding view. A customer who has just signed up has given the kitchen a
 * name and a phone number but no address yet, so the account page opens on the
 * address form before it opens on anything else. It is a prompt, not a gate:
 * every other view stays one tab away.
 */
export const ACCOUNT_ONBOARDING_HEADING = 'Where should the meals go?'

export const ACCOUNT_ONBOARDING_INTRO =
  'One thing left: the address we should bring your meals to. The kitchen reads it from here on every order.'

export const ACCOUNT_ONBOARDING_SKIP = 'I will add this later'

export const ACCOUNT_PHONE_LABEL = 'Phone number'

export const ACCOUNT_ADDRESS_LINE1_LABEL = 'Address line 1'

export const ACCOUNT_ADDRESS_LINE2_LABEL = 'Address line 2 (optional)'

export const ACCOUNT_CITY_LABEL = 'City'

export const ACCOUNT_STATE_LABEL = 'State'

export const ACCOUNT_PINCODE_LABEL = 'Pincode'

export const ACCOUNT_PROFILE_SAVE = 'Save details'

export const ACCOUNT_PROFILE_SAVED = 'Saved. We use these details when you order.'

export const ACCOUNT_PROFILE_INVALID = 'Please check the highlighted fields and try again.'

export const ACCOUNT_PROFILE_SAVE_FAILED =
  'We could not save your details just now. Please try again in a moment.'

/**
 * Pausing or cancelling a paid order is a conversation with the kitchen, not a
 * form: each order row offers WhatsApp and a phone call, with the order number
 * already in the message.
 */
export const ACCOUNT_ORDER_HELP = 'To pause or cancel this order, message or call the kitchen.'

export const ACCOUNT_ORDER_WHATSAPP = 'WhatsApp us'

export const ACCOUNT_ORDER_CALL = 'Call'

export const accountOrderMessage = (orderId: number | string): string =>
  `Hi UNAVE, I would like to pause or cancel my order #${orderId}.`

/** Greet by first name when we have one, so the page does not feel like a console. */
export const accountGreeting = (name: string | null, email: string): string => {
  const first = name?.trim().split(/\s+/)[0]
  return `Hello, ${first && first.length > 0 ? first : email}`
}
