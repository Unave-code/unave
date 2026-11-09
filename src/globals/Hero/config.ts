import type { GlobalConfig } from 'payload'

import {
  HERO_EYEBROW,
  HERO_HEADLINE,
  HERO_HEADLINE_ACCENT,
  HERO_SECONDARY,
  HERO_SUB,
  HOME_HREF_HOW_IT_WORKS,
} from '@/utilities/homeCopy'

import { revalidateHero } from './hooks/revalidateHero'

/**
 * The first slide mirrors the hero the page shipped with (design.md §6.3), so the
 * admin opens on something familiar and the site renders the same thing whether
 * the kitchen has touched this global or not.
 */
const DEFAULT_SLIDE = {
  eyebrow: HERO_EYEBROW,
  headline: `${HERO_HEADLINE} *${HERO_HEADLINE_ACCENT}*`,
  subLine: HERO_SUB,
  primaryLabel: '',
  primaryWhatsapp: true,
  primaryUrl: '',
  primaryNewTab: false,
  secondaryLabel: HERO_SECONDARY,
  secondaryUrl: HOME_HREF_HOW_IT_WORKS,
  secondaryNewTab: false,
}

/**
 * The carousel at the top of the home page (design.md §6.3). Everything on a slide
 * is editorial, like the Site chrome globals: the words, the photograph, both
 * buttons. Five slides at most — a carousel that never stops rotating is the
 * opposite of the calm this brand sells (design.md §1).
 *
 * The primary button is WhatsApp-aware: by default it opens WhatsApp on the
 * footer's number with the opening line already written, exactly like the hero
 * always did, so the number is edited in one place. A slide can opt out and point
 * anywhere instead.
 */
export const Hero: GlobalConfig = {
  slug: 'hero',
  label: 'Home hero',
  access: {
    read: () => true,
  },
  admin: {
    description:
      'The carousel at the top of the home page. One slide shows at a time; leave a photograph empty to keep the built-in kitchen photo.',
    group: 'Home page',
  },
  fields: [
    {
      name: 'slides',
      type: 'array',
      label: 'Slides',
      maxRows: 5,
      defaultValue: () => [{ ...DEFAULT_SLIDE }],
      admin: {
        description:
          'Shown one at a time across the top of the home page. The first slide is the page headline; the carousel turns by itself every few seconds unless a visitor pauses it.',
        components: {
          RowLabel: '@/globals/Hero/RowLabel#RowLabel',
        },
      },
      fields: [
        {
          name: 'eyebrow',
          type: 'text',
          label: 'Eyebrow',
          admin: {
            description: 'The small gold line above the headline, for example "Cloud kitchen · Cooked fresh". Leave empty for none.',
          },
        },
        {
          name: 'headline',
          type: 'text',
          label: 'Headline',
          required: true,
          admin: {
            description:
              'The big Playfair line. Wrap the phrase to set in gold italics in asterisks, for example: Good food, cooked in *our own kitchen*.',
          },
        },
        {
          name: 'subLine',
          type: 'textarea',
          label: 'Sub-line',
          admin: {
            description: 'One or two quiet sentences under the headline. Leave empty for none.',
          },
        },
        {
          name: 'image',
          type: 'upload',
          label: 'Photograph',
          relationTo: 'media',
          admin: {
            description:
              'Runs full-bleed behind this slide under a green scrim. Leave empty to keep the built-in kitchen photograph.',
          },
        },
        {
          name: 'primaryLabel',
          type: 'text',
          label: 'Primary button label',
          admin: {
            description: 'The gold pill. Leave empty for "Message us on WhatsApp".',
          },
        },
        {
          name: 'primaryWhatsapp',
          type: 'checkbox',
          defaultValue: true,
          label: 'Primary button opens WhatsApp',
          admin: {
            description:
              'On: the button opens WhatsApp on the footer\'s number with the opening line written. Off: it follows the Primary link below instead.',
          },
        },
        {
          name: 'primaryUrl',
          type: 'text',
          label: 'Primary link',
          admin: {
            description: 'Used only when "opens WhatsApp" is off. A path such as /products, or a full URL.',
          },
        },
        {
          name: 'primaryNewTab',
          type: 'checkbox',
          defaultValue: false,
          label: 'Open primary in a new tab',
        },
        {
          name: 'secondaryLabel',
          type: 'text',
          label: 'Secondary button label',
          admin: {
            description: 'The quiet outlined pill beside the primary. Leave empty for no secondary button.',
          },
        },
        {
          name: 'secondaryUrl',
          type: 'text',
          label: 'Secondary link',
          admin: {
            description: 'A path such as #how-it-works, or a full URL.',
          },
        },
        {
          name: 'secondaryNewTab',
          type: 'checkbox',
          defaultValue: false,
          label: 'Open secondary in a new tab',
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateHero],
  },
}
