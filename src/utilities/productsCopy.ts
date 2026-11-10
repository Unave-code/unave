/**
 * The words on `/products` (spec 0007).
 *
 * The kitchen sells meal products on the site again: pick a product, choose how
 * long it runs, pay once. Browsing needs no account, and the page says so,
 * because the promise that nobody must sign in just to look around is one the
 * site keeps everywhere except at checkout.
 */

import { WHATSAPP_CTA_LABEL } from '@/utilities/whatsapp'

export const PRODUCTS_PAGE_TITLE = 'Meal products'
export const PRODUCTS_PAGE_DESCRIPTION =
  'Home style meals as a product: a week or a month of lunches and dinners, cooked in our kitchen and delivered to your door. Pay once, eat well every day.'

export const PRODUCTS_HERO_EYEBROW = 'Meal products'
export const PRODUCTS_HERO_HEADLINE = 'Plan your week,'
export const PRODUCTS_HERO_HEADLINE_ACCENT = 'skip the daily question'
export const PRODUCTS_HERO_SUB =
  'Choose how long you want home style meals to arrive for, and add it to your cart. Pay once for the whole basket. No account needed to look around.'

export const PRODUCTS_CTA_BROWSE = 'Browse the products'
export const PRODUCTS_CTA_MESSAGE = WHATSAPP_CTA_LABEL

/**
 * The lead price line on a product card: the cheapest per-day rate across the
 * product's durations, so a shopper comparing plans sees the running cost
 * before any duration is chosen. Composed as `From ₹60 a day`.
 */
export const PRODUCTS_CARD_FROM = 'From'
export const PRODUCTS_CARD_A_DAY = 'a day'

export const PRODUCTS_FINAL_HEADING = 'Ready when you are'
export const PRODUCTS_FINAL_BODY =
  'Add the products and durations you want to your cart, pay once at checkout, and the kitchen takes it from there. Questions first? We are one message away.'

export const PRODUCTS_GRID_HEADING = 'The products'
export const PRODUCTS_GRID_INTRO =
  'Every product is cooked fresh in our own kitchen and delivered on the days you choose. Pick a duration on the card and add it to your cart; take more than one if the week needs it, then pay once at checkout.'

export const PRODUCTS_EMPTY_HEADING = 'No products are open right now'
export const PRODUCTS_EMPTY_BODY =
  'We are between menus. Message the kitchen and we will tell you what we can cook for you this week.'

export const PRODUCTS_PAUSED_NOTE_TITLE = 'What "paused" means'
export const PRODUCTS_PAUSED_NOTE_BODY =
  'A paused product is still shown because it may come back, but it cannot be bought today. Message us if you were hoping to start with one of them.'

export const PRODUCTS_HOW_HEADING = 'How a product works'
export const PRODUCTS_HOW_STEPS = [
  {
    body: 'Pick a duration on a product and add it to your cart. Looking around needs no account.',
    title: 'Fill your cart',
  },
  {
    body: 'At checkout you sign in, so the kitchen knows who ordered and where to deliver, then pay once for the whole cart.',
    title: 'Sign in and pay once',
  },
  {
    body: 'The kitchen sees the order right away and messages you about when deliveries begin.',
    title: 'We start cooking',
  },
]
