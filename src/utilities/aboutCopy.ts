/**
 * Every fixed string the about page shows (spec 0006). Kept in one module so the
 * page and any future reuse cannot drift, like homeCopy and contactCopy.
 */

import type { ProductCategoryValue } from '@/utilities/productsCategoryCopy'
import { WHATSAPP_CTA_LABEL } from '@/utilities/whatsapp'

export const ABOUT_PAGE_TITLE = 'About us'
export const ABOUT_PAGE_DESCRIPTION =
  'UNAVE is a woman-led food and lifestyle platform making healthy living simple: ready to cook, ready to eat, and farm-fresh food products under one roof.'

export const ABOUT_TAGLINE = 'Your Complete Health Partner'

export const ABOUT_HERO_EYEBROW = 'About UNAVE'
export const ABOUT_HERO_HEADLINE = 'Healthy living.'
export const ABOUT_HERO_HEADLINE_ACCENT = 'Made easy.'
export const ABOUT_HERO_SUB =
  'At UNAVE, we believe healthy living should not be complicated. It should be simple, convenient and within everyone’s reach.'
export const ABOUT_HERO_CTA = WHATSAPP_CTA_LABEL

/** Photography (design.md §8): the band photos are decorative; the others are content. */
export const ABOUT_IMAGES = {
  hero: '/images/about/indian-meal.png',
  journey: '/images/footer-field.jpg',
  story: '/images/kitchen.jpg',
} as const

export const ABOUT_STORY_IMAGE_ALT = 'Cooking together at a home kitchen counter'

export const ABOUT_STORY_EYEBROW = 'Where it began'
export const ABOUT_STORY_HEADING = 'Why should eating healthy be difficult?'
export const ABOUT_STORY_PARAGRAPHS = [
  'UNAVE was born from that one simple question, asked in the middle of today’s busy lives.',
  'As a woman entrepreneur, working professional, wife, mother, sister and homemaker, I understand the everyday challenge of balancing family, work and my own well-being. Finding time to prepare fresh, nutritious meals is not always easy, whether you are an IT professional, a working individual, a homemaker, a bachelor or a fitness enthusiast.',
  'That understanding inspired us to build UNAVE: a modern food and lifestyle platform that makes everyday healthy living easier.',
] as const
export const ABOUT_STORY_SIGNATURE = 'Founder, UNAVE'

export const ABOUT_NAME_EYEBROW = 'The story behind the name'
export const ABOUT_NAME_HEADING = 'What UNAVE means'
export const ABOUT_NAME_PARTS = [
  { term: 'Unavu', meaning: 'Food, in Tamil' },
  { term: 'Vision', meaning: 'A woman entrepreneur’s' },
] as const
export const ABOUT_NAME_PARAGRAPHS = [
  'The name UNAVE brings together Unavu (food) and a woman entrepreneur’s vision. It reflects who we are: a food venture built on a woman’s understanding of everyday family needs, nutrition, convenience and care.',
  'What started as a vision to simplify healthy eating is growing into a complete food ecosystem, bringing fresh food, convenient meal solutions and farm-fresh products together under one roof.',
] as const

export const ABOUT_RANGE_HEADING = 'What we bring to you'
export const ABOUT_RANGE_INTRO = 'Three simple ways we make everyday life easier.'
export const ABOUT_RANGE: {
  alt: string
  category: ProductCategoryValue
  image: string
  link: string
  text: string
  title: string
}[] = [
  {
    alt: 'Freshly cut cabbage, carrots and beans on a plate',
    category: 'ready-to-cook',
    image: '/images/about/ready-to-cook.webp',
    link: 'See ready to cook',
    text: 'Freshly cleaned, cut and packed vegetables that save prep time for homemakers, working professionals and bachelors.',
    title: 'Ready to cook',
  },
  {
    alt: 'A colourful salad bowl with chickpeas, avocado and vegetables',
    category: 'ready-to-eat',
    image: '/images/category-healthy.jpg',
    link: 'See ready to eat',
    text: 'Salads, fruit bowls, healthy meal trays, breakfast options, juices and snacks made for easy everyday eating.',
    title: 'Ready to eat',
  },
  {
    alt: 'Home-ground sambar podi in a wooden bowl',
    category: 'fresh-from-produce',
    image: '/images/about/farm-products.webp',
    link: 'See farm fresh products',
    text: 'Products sourced directly from farmers and makers, bringing original farm-fresh ingredients and value-added foods closer to you.',
    title: 'Farm fresh & food products',
  },
]

export const ABOUT_NEEDS_HEADING = 'Food that understands your needs'
export const ABOUT_NEEDS_INTRO =
  'Every person has different nutrition needs and lifestyle goals, so our range is planned around them.'
export const ABOUT_NEEDS = [
  'Weight management & fat loss',
  'Muscle gain & protein-rich meals',
  'Fitness & gym nutrition',
  'Sugar-conscious food choices',
  'Thyroid-conscious food options',
  'Hair & skin nutrition',
  'Everyday family & children’s nutrition',
] as const

export const ABOUT_JOURNEY_EYEBROW = 'Our journey & purpose'
export const ABOUT_JOURNEY_HEADING = 'Built step by step, with care'
export const ABOUT_JOURNEY_PARAGRAPHS = [
  'Building UNAVE has been a journey of passion, determination, challenges and constant learning.',
  'We are not simply building a food business. We are building a platform that brings food, convenience and nutrition together for modern living.',
] as const
export const ABOUT_JOURNEY_STEPS = [
  'Sourcing fresh ingredients and working directly with farmers',
  'Managing short shelf lives and reducing food waste',
  'Developing products and keeping quality consistent',
  'Earning and keeping your trust',
] as const

export const ABOUT_VISION_EYEBROW = 'Our vision'
export const ABOUT_VISION =
  'To become a trusted food and wellness destination, where everything you need for fresh, convenient and healthier everyday living is under one roof.'

export const ABOUT_PROMISE_HEADING = 'Our promise'
export const ABOUT_PROMISE_TITLE = 'What every order keeps to'
export const ABOUT_PROMISE = [
  { lead: 'Freshness', rest: 'in every pack.' },
  { lead: 'Nutrition', rest: 'in every choice.' },
  { lead: 'Care', rest: 'in every step.' },
] as const

export const ABOUT_FINAL_BODY =
  'Have a question, or want help choosing? Message us and a real person from our team will answer.'
export const ABOUT_FINAL_PRIMARY = WHATSAPP_CTA_LABEL
export const ABOUT_FINAL_SECONDARY = 'Contact us'
