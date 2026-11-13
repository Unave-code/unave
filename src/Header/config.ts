import type { FieldHook, GlobalConfig } from 'payload'

import { link } from '@/fields/link'
import { revalidateHeader } from './hooks/revalidateHeader'

/**
 * Defaults for a new announcement bar. The read hooks retain the original
 * single-message values until existing globals have their message rows.
 */
const ANNOUNCEMENT_DEFAULTS = {
  enabled: true,
  text: "This week's menu is live",
  note: 'The kitchen is taking orders',
  linkLabel: 'Message us',
  linkUrl: '/contact',
} as const

/** Fill a field with its default when the stored document has no value yet. */
const fillDefault =
  (fallback: string | boolean): FieldHook =>
  ({ value }) =>
    value ?? fallback

/**
 * The sticky bar at the top of every page (design.md §6.2).
 *
 * The announcements, links and floating WhatsApp button come from the CMS.
 */
export const Header: GlobalConfig = {
  slug: 'header',
  access: {
    read: () => true,
  },
  admin: {
    description: 'The top of every page: the announcement strip, menu links, WhatsApp.',
    group: 'Site chrome',
  },
  fields: [
    {
      name: 'announcement',
      type: 'group',
      label: 'Announcement bar',
      admin: {
        description:
          'The moving strip above the navbar on every page. Untick it to hide the strip everywhere (design.md §6.2).',
      },
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: ANNOUNCEMENT_DEFAULTS.enabled,
          hooks: { afterRead: [fillDefault(ANNOUNCEMENT_DEFAULTS.enabled)] },
          label: 'Show the announcement bar',
        },
        {
          name: 'messages',
          type: 'array',
          label: 'Announcements',
          minRows: 1,
          defaultValue: [
            {
              text: ANNOUNCEMENT_DEFAULTS.text,
              note: ANNOUNCEMENT_DEFAULTS.note,
              linkLabel: ANNOUNCEMENT_DEFAULTS.linkLabel,
              linkUrl: ANNOUNCEMENT_DEFAULTS.linkUrl,
            },
          ],
          admin: {
            description: 'Add one or more announcements. They move across the top of every page.',
            initCollapsed: true,
          },
          fields: [
            {
              name: 'text',
              type: 'text',
              label: 'Headline',
              required: true,
            },
            {
              name: 'note',
              type: 'text',
              label: 'Supporting line',
            },
            {
              name: 'linkLabel',
              type: 'text',
              label: 'Link label',
            },
            {
              name: 'linkUrl',
              type: 'text',
              label: 'Link',
              admin: {
                description: 'Optional. A path such as /contact, or a full URL.',
              },
            },
            {
              name: 'newTab',
              type: 'checkbox',
              defaultValue: false,
              label: 'Open in a new tab',
            },
          ],
        },
        {
          name: 'text',
          type: 'text',
          label: 'Legacy headline',
          defaultValue: ANNOUNCEMENT_DEFAULTS.text,
          hooks: { afterRead: [fillDefault(ANNOUNCEMENT_DEFAULTS.text)] },
          admin: { hidden: true },
        },
        {
          name: 'note',
          type: 'text',
          label: 'Legacy supporting line',
          defaultValue: ANNOUNCEMENT_DEFAULTS.note,
          hooks: { afterRead: [fillDefault(ANNOUNCEMENT_DEFAULTS.note)] },
          admin: { hidden: true },
        },
        {
          name: 'linkLabel',
          type: 'text',
          label: 'Legacy link label',
          defaultValue: ANNOUNCEMENT_DEFAULTS.linkLabel,
          hooks: { afterRead: [fillDefault(ANNOUNCEMENT_DEFAULTS.linkLabel)] },
          admin: { hidden: true },
        },
        {
          name: 'linkUrl',
          type: 'text',
          label: 'Legacy link',
          defaultValue: ANNOUNCEMENT_DEFAULTS.linkUrl,
          hooks: { afterRead: [fillDefault(ANNOUNCEMENT_DEFAULTS.linkUrl)] },
          admin: { hidden: true },
        },
        {
          name: 'newTab',
          type: 'checkbox',
          defaultValue: false,
          label: 'Legacy open in a new tab',
          admin: { hidden: true },
        },
      ],
    },
    {
      name: 'navItems',
      type: 'array',
      label: 'Menu links',
      maxRows: 7,
      admin: {
        description:
          'Shown in the desktop bar and in the mobile drawer. Seven at most. The cart control on the right of the desktop bar is always shown; add a link to /cart here to choose its label and its place in the drawer.',
        initCollapsed: true,
        components: {
          RowLabel: '@/Header/RowLabel#RowLabel',
        },
      },
      fields: [
        link({
          appearances: false,
        }),
      ],
    },
    {
      name: 'whatsapp',
      type: 'group',
      label: 'WhatsApp button',
      admin: {
        description:
          'The floating button at the bottom right. Leave the number empty and it stays hidden.',
      },
      fields: [
        {
          name: 'number',
          type: 'text',
          label: 'Number',
          admin: {
            description: 'Digits only, with the country code. For example: 919840821526',
          },
        },
        {
          name: 'message',
          type: 'text',
          label: 'Pre-filled message',
          admin: {
            description: 'Optional. Appears in the chat box when the customer taps the button.',
          },
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateHeader],
  },
}
