/**
 * Every fixed string on the homepage (design.md §10.1). Kept in one module so the
 * sections, the metadata and the structured data cannot drift apart.
 *
 * Voice rules live in design.md §11: plain, warm, specific, no medical or result
 * promises, verbs on buttons.
 *
 * Anything marked with an em dash (—) is a placeholder awaiting a real number from
 * the business. Search this file for `—` before launch.
 */

export const HOME_TITLE = 'UNAVE | Healthy food, cooked in our own kitchen'
export const HOME_DESCRIPTION =
  'Healthy, nutrition-conscious and diabetes-conscious meals cooked fresh in our cloud kitchen. Tell us what you need and we will cook it.'

/**
 * Placeholder photography: free-licence stock, already cropped and compressed to
 * the sizes these slots use. design.md §8 describes the real shoot; swap these
 * files (same names, same paths) when it lands and nothing else has to change.
 */
export const IMAGES = {
  /** A full day of meals, shown when no banner images are configured. */
  heroBg: '/images/hero-table.jpg',
  /** The same laid-out table, reused beside the common questions. */
  faq: '/images/hero-table.jpg',
} as const

/** 1. Announcement bar now lives in the site chrome (Header global), above the navbar. */

/** 2. The image slider's accessible heading. */
export const HERO_HEADLINE = 'Good food, cooked in'
export const HERO_HEADLINE_ACCENT = 'our own kitchen.'

/** 4. What makes us different. `icon` is resolved to a glyph in Benefits.tsx, and the
 * three with an `image` are the ones the bento gives a wide or tall tile to, so the
 * copy is ordered kitchen first, then how you talk to us, then what we keep. Those
 * three photographs deliberately skip `/images/hero-table.jpg`, which the hero uses. */
export const BENEFITS_HEADING = 'What makes us different'
export const BENEFITS_INTRO =
  'Six decisions about how the kitchen runs, and what each one means for your week.'
export const BENEFITS = [
  {
    title: 'One kitchen, one focus',
    body: 'We cook healthy food only. Nothing else competes for the kitchen’s attention.',
    icon: 'chef',
    image: '/images/band-cta.jpg',
  },
  {
    title: 'Cooked, not assembled',
    body: 'Meals are cooked in our kitchen, in batches we can actually control.',
    icon: 'flame',
    image: '/images/gallery-2.jpg',
  },
  {
    title: 'Message us, we sort it out',
    body: 'No forms to fight. Tell us what you need on WhatsApp and we will plan the week with you.',
    icon: 'message',
  },
  {
    title: 'Change it whenever you like',
    body: 'Want to skip a day or stop? One message and it is done. No app, no phone tree.',
    icon: 'refresh',
  },
  {
    title: 'Honest about the food',
    body: 'We describe what we cook plainly. No promises about outcomes, no invented claims.',
    icon: 'badge',
    image: '/images/gallery-3.jpg',
  },
  {
    title: 'A preference we remember',
    body: 'Vegetarian, vegan or anything else, we keep it with your details so the kitchen knows.',
    icon: 'preference',
  },
] as const

/** 5. What we cook */
export const CATEGORIES_HEADING = 'What we cook'
export const CATEGORIES_INTRO =
  'Four kinds of food, one kitchen. Every meal is cooked the day it is sent out.'
export const CATEGORIES = [
  {
    name: 'Healthy food',
    description:
      'Balanced everyday meals cooked the way you would at home. Fresh vegetables, dal, rice, rotis and millets.',
    accent: 'healthy',
    image: '/images/category-healthy.jpg',
  },
  {
    name: 'Nutrition food',
    description:
      'Built around protein, fibre and whole grains, for people who read labels and want their plate to earn its place.',
    accent: 'nutrition',
    image: '/images/category-nutrition.jpg',
  },
  {
    name: 'Diet food',
    description:
      'Lighter portions and simple cooking, without cutting the flavour down to nothing. Sensible, not punishing.',
    accent: 'diet',
    image: '/images/category-diet.jpg',
  },
  {
    name: 'Diabetes-conscious',
    description:
      'No added sugar, controlled portions and slow-release grains, cooked to a routine you can rely on.',
    note: 'Food option, not medical advice.',
    accent: 'diabetes',
    image: '/images/category-diabetes.jpg',
  },
] as const

/** Featured products selected by the kitchen. */
export const BEST_SELLERS_HEADING = 'Best sellers'
export const BEST_SELLERS_INTRO = 'Featured products selected by our kitchen.'
export const BEST_SELLERS_EMPTY = 'No products are featured right now.'

/** 6b. Category browsing. */
export const PRODUCTS_SECTION_HEADING = 'Choose your category'
export const PRODUCTS_SECTION_INTRO =
  'Browse the meal types, then find a product that fits your week.'
export const PRODUCTS_SECTION_CTA = 'See every product'

/** The notice block required wherever a medical or dietary claim is made (design.md §6.11). */
export const NOTICE_TITLE = 'A note on your goals'
export const NOTICE_BODY =
  'We cook healthy food and we describe it honestly. We do not promise weight loss, muscle gain or any medical outcome, and our meals are not a substitute for advice from your doctor or a qualified nutritionist. If you are managing a condition, please talk to them about your food.'

/** Homepage food photography and captions. */
export const GALLERY = [
  {
    image: '/images/gallery-1.jpg',
    alt: 'A plated meal with vegetables and sauce',
  },
  {
    image: '/images/gallery-2.jpg',
    alt: 'A salad with sliced avocado, greens and pomegranate',
  },
  {
    image: '/images/gallery-3.jpg',
    alt: 'Fresh vegetables arranged on a kitchen prep board',
  },
] as const

/** 7. How it works */
export const STEPS_HEADING = 'How it works'
export const STEPS_INTRO =
  'Four steps from your first message to the box at your door, and nothing is cooked until you have agreed it.'
export const STEPS = [
  { title: 'Tell us what you need', body: 'Message us, or use the form on the contact page.' },
  {
    title: 'We plan the week',
    body: 'The kitchen confirms what we can cook and when we can deliver.',
  },
  { title: 'We cook and deliver', body: 'Fresh the same morning, packed to travel to your door.' },
  { title: 'Say if it changes', body: 'One message to skip a day, change a meal or stop.' },
] as const

/** 9. Customer words. Placeholders until real, attributed quotes arrive. */
export const TESTIMONIALS_HEADING = 'What customers say'
export const TESTIMONIALS = [
  { quote: '[Customer quote goes here]', name: '[Customer name]', note: '[Area]' },
  { quote: '[Customer quote goes here]', name: '[Customer name]', note: '[Area]' },
  { quote: '[Customer quote goes here]', name: '[Customer name]', note: '[Area]' },
] as const
export const TESTIMONIALS_PLACEHOLDER =
  'Placeholder quotes. Real, attributed customer words only, and no health outcomes.'

/** 10. Common questions */
export const FAQ_HEADING = 'Common questions'
export const FAQ_PHOTO = 'The day’s meals, laid out ready to pack'
export const FAQ = [
  {
    question: 'How do I order?',
    answer:
      'Message us on WhatsApp or use the form on the contact page. Tell us what you eat, how often and where you are, and the kitchen comes back to you with a plan.',
  },
  {
    question: 'When and where do you deliver?',
    answer:
      'We deliver on the schedule the kitchen agrees with you. Tell us your address when you get in touch and we will confirm whether we reach you before anything is cooked.',
  },
  {
    question: 'Can I pause or cancel?',
    answer:
      'Yes. Tell us in a message and it is done. You tell us what you need, and nothing is cooked until you have agreed it.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'No. You can browse and order without one. An account is there if you want your details saved and your history in one place.',
  },
  {
    question: 'I have allergies or a health condition. Can I order?',
    answer:
      'Tell us when you get in touch and we will tell you honestly what we can and cannot do. Our meals are food options and are not a substitute for medical or nutritional advice.',
  },
] as const
