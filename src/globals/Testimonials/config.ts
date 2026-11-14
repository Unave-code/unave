import type { GlobalConfig } from 'payload'

import { isStaff } from '@/access/isStaff'
import { revalidateTestimonials } from './hooks/revalidateTestimonials'

type Sibling = { kind?: 'text' | 'video' | null }

const isVideo = (_: unknown, sibling: Sibling) => sibling?.kind === 'video'

/**
 * Customer words for the home page, shown above the common questions. Each entry is
 * either a written quote or a short video. design.md §11: real, attributed customers
 * only, and no health outcomes or before-and-after claims.
 */
export const Testimonials: GlobalConfig = {
  slug: 'testimonials',
  label: 'Testimonials',
  access: {
    read: () => true,
    update: isStaff,
  },
  admin: {
    description:
      'Written and video testimonials shown on the home page above Common questions. The section is hidden while the list is empty.',
    group: 'Home page',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: 'Section heading',
      defaultValue: 'What customers say',
    },
    {
      name: 'items',
      type: 'array',
      label: 'Testimonials',
      labels: { singular: 'Testimonial', plural: 'Testimonials' },
      defaultValue: () => [],
      admin: {
        description:
          'Drag to reorder. Use real, attributed customer words only. No health outcomes or before-and-after claims.',
        components: {
          RowLabel: '@/globals/Testimonials/RowLabel#RowLabel',
        },
      },
      fields: [
        {
          name: 'kind',
          type: 'radio',
          label: 'Type',
          required: true,
          defaultValue: 'text',
          options: [
            { label: 'Text quote', value: 'text' },
            { label: 'Video', value: 'video' },
          ],
          admin: { layout: 'horizontal' },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'name',
              type: 'text',
              label: 'Customer name',
              required: true,
            },
            {
              name: 'note',
              type: 'text',
              label: 'Area or detail',
              admin: { description: 'Optional, for example "Anna Nagar" or "Weekly subscriber".' },
            },
          ],
        },
        {
          name: 'quote',
          type: 'textarea',
          label: 'Quote',
          admin: {
            description: 'Required for a text quote. For a video, an optional short line shown below it.',
          },
          validate: (value, { siblingData }) => {
            if ((siblingData as Sibling)?.kind === 'video') return true
            return typeof value === 'string' && value.trim() ? true : 'Add the customer’s quote.'
          },
        },
        {
          name: 'video',
          type: 'upload',
          label: 'Video file',
          relationTo: 'media',
          filterOptions: { mimeType: { contains: 'video' } },
          admin: {
            condition: isVideo,
            description: 'An MP4 or WebM under about 30 MB plays best on phones.',
          },
          validate: (value: unknown, { siblingData }: { siblingData: unknown }) => {
            if ((siblingData as Sibling)?.kind !== 'video') return true
            return value ? true : 'Choose a video.'
          },
        },
        {
          name: 'poster',
          type: 'upload',
          label: 'Cover image',
          relationTo: 'media',
          filterOptions: { mimeType: { contains: 'image' } },
          admin: {
            condition: isVideo,
            description: 'Optional. Shown before the video plays.',
          },
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateTestimonials],
  },
}
