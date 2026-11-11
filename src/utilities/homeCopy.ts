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

import { WHATSAPP_CTA_LABEL } from '@/utilities/whatsapp'

export const HOME_TITLE = 'UNAVE | Healthy food, cooked in our own kitchen'
export const HOME_DESCRIPTION =
  'Healthy, nutrition-conscious and diabetes-conscious meals cooked fresh in our cloud kitchen. Tell us what you need and we will cook it.'

/** Where the calls to action point. Only pages that exist today. */
export const HOME_HREF_CONTACT = '/contact'
export const HOME_HREF_HOW_IT_WORKS = '#how-it-works'
export const HOME_HREF_FAQ = '#faq'

/**
 * Placeholder photography: free-licence stock, already cropped and compressed to
 * the sizes these slots use. design.md §8 describes the real shoot; swap these
 * files (same names, same paths) when it lands and nothing else has to change.
 */
export const IMAGES = {
  /** A full day of meals, photographed from above. Sits behind the hero. */
  heroBg: '/images/hero-table.jpg',
  /** Our kitchen, mid-service. */
  kitchen: '/images/kitchen.jpg',
  /** The same laid-out table, reused beside the common questions. */
  faq: '/images/hero-table.jpg',
} as const

/** 1. Announcement bar now lives in the site chrome (Header global), above the navbar. */

/** 2. Hero. These strings seed the Home hero global's default slide (§6.3) and
 * stand in again if the global ever renders without slides. Editing the live hero
 * happens in the admin; editing here changes what a fresh global starts from. */
export const HERO_EYEBROW = 'Cloud kitchen · Cooked fresh'
export const HERO_HEADLINE = 'Good food, cooked in'
export const HERO_HEADLINE_ACCENT = 'our own kitchen.'
export const HERO_SUB =
  'Healthy, nutrition-conscious and diabetes-conscious meals, cooked in small batches and delivered to your door.'
export const HERO_PRIMARY = WHATSAPP_CTA_LABEL
export const HERO_SECONDARY = 'How It Works'

/** Feature chips under the hero buttons, shared by every slide. `icon` is resolved in HeroCarousel.tsx. */
export const HERO_CHIPS = [
  { label: 'Fresh daily', icon: 'leaf' },
  { label: 'Small batches', icon: 'flask' },
  { label: 'No account needed', icon: 'lock' },
  { label: 'Home-style cooking', icon: 'utensils' },
] as const

/** 3. Trust strip. Every claim here has to survive a question, and a note is
 * rendered only when it says something specific — an empty note leaves the
 * label standing on its own rather than showing a stub. */
export const TRUST = [
  {
    label: 'Delivered to your door',
    /** Deliberately area-less: zones are confirmed by message (see the FAQ), never promised. */
    note: 'On the schedule we agree with you',
    icon: 'truck',
  },
  {
    label: 'Cooked in our kitchen',
    note: 'Small batches, every day',
    icon: 'utensils',
  },
  {
    label: 'FSSAI licensed',
    /** The licence number is still owed by the business; until it lands the label carries the claim alone. */
    note: '',
    icon: 'badge',
  },
  {
    label: 'Home-style cooking',
    note: 'Oil, salt and portions we control',
    icon: 'leaf',
  },
  {
    label: 'One kitchen, one focus',
    note: 'Healthy food only',
    icon: 'shield',
  },
] as const

/** 4. Welcome */
export const WELCOME_HEADING = 'Welcome to UNAVE'
export const WELCOME_BODY = [
  'We are a cloud kitchen that cooks one kind of food: healthy, home-style meals, cooked fresh so the daily question of what to eat is already answered.',
  'Tell us what you need and how often, and we cook, pack and deliver on the schedule you agree with us. You can change or stop whenever you like, with one message.',
]
export const WELCOME_PHOTO = 'Our kitchen, mid-service'

/** 5. What makes us different. `icon` is resolved to a glyph in Benefits.tsx, and the
 * three with an `image` are the ones the bento gives a wide or tall tile to, so the
 * copy is ordered kitchen first, then how you talk to us, then what we keep. Those
 * three photographs deliberately skip `/images/kitchen.jpg`, which the welcome
 * section above already shows, and `/images/hero-table.jpg`, which the hero uses. */
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

/** 6. What we cook */
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

/** 6b. Products. Featured open products first, then the newest open ones, four at most. */
export const PRODUCTS_SECTION_HEADING = 'Choose your product'
export const PRODUCTS_SECTION_INTRO =
  'A product is a length of meals cooked from this kitchen, paid once. Pick the length that suits your week and we cook from it.'
export const PRODUCTS_SECTION_CTA = 'See every product'
export const PRODUCTS_SECTION_EMPTY_HEADING = 'The menu is being set'
export const PRODUCTS_SECTION_EMPTY_BODY =
  'No products are open right now. Message the kitchen and we will tell you what we can cook for you this week.'

/** The notice block required wherever a medical or dietary claim is made (design.md §6.11). */
export const NOTICE_TITLE = 'A note on your goals'
export const NOTICE_BODY =
  'We cook healthy food and we describe it honestly. We do not promise weight loss, muscle gain or any medical outcome, and our meals are not a substitute for advice from your doctor or a qualified nutritionist. If you are managing a condition, please talk to them about your food.'

/** 7b. From our kitchen. Placeholder photography, captions only, no claims. */
export const GALLERY_HEADING = 'From our kitchen'
export const GALLERY_INTRO =
  'A look at what leaves the kitchen: cooked the same morning, portioned, and packed to travel.'
export const GALLERY = [
  { image: '/images/gallery-1.jpg', caption: 'Morning prep, before the first delivery' },
  { image: '/images/gallery-2.jpg', caption: 'Cooked in batches we can actually control' },
  { image: '/images/gallery-3.jpg', caption: 'Portioned for one sitting, nothing wasted' },
] as const

/** 8. How it works */
export const STEPS_HEADING = 'How it works'
export const STEPS_INTRO =
  'Four steps from your first message to the box at your door, and nothing is cooked until you have agreed it.'
export const STEPS = [
  { title: 'Tell us what you need', body: 'Message us, or use the form on the contact page.' },
  { title: 'We plan the week', body: 'The kitchen confirms what we can cook and when we can deliver.' },
  { title: 'We cook and deliver', body: 'Fresh the same morning, packed to travel to your door.' },
  { title: 'Say if it changes', body: 'One message to skip a day, change a meal or stop.' },
] as const

/** 10. Customer words. Placeholders until real, attributed quotes arrive. */
export const TESTIMONIALS_HEADING = 'What customers say'
export const TESTIMONIALS = [
  { quote: '[Customer quote goes here]', name: '[Customer name]', note: '[Area]' },
  { quote: '[Customer quote goes here]', name: '[Customer name]', note: '[Area]' },
  { quote: '[Customer quote goes here]', name: '[Customer name]', note: '[Area]' },
] as const
export const TESTIMONIALS_PLACEHOLDER =
  'Placeholder quotes. Real, attributed customer words only, and no health outcomes.'

/** 11. Common questions */
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
