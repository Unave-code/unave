import type { GlobalConfig } from 'payload'

import { revalidateHero } from './hooks/revalidateHero'

/** Uploaded banners for the image slider at the top of the home page. */
export const Hero: GlobalConfig = {
  slug: 'hero',
  label: 'Home hero',
  access: {
    read: () => true,
  },
  admin: {
    description:
      'Upload the promotional images shown in the home page slider. Set each image’s alt text in Media for accessibility.',
    group: 'Home page',
  },
  fields: [
    {
      name: 'slides',
      type: 'array',
      label: 'Images',
      maxRows: 5,
      defaultValue: () => [],
      admin: {
        description:
          'Add up to five wide banner images. They rotate automatically, and visitors can pause or move between them.',
        components: {
          RowLabel: '@/globals/Hero/RowLabel#RowLabel',
        },
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          label: 'Banner image',
          relationTo: 'media',
          admin: {
            description:
              'Choose a wide banner. Add meaningful alt text to the media item; older empty slides are ignored.',
          },
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateHero],
  },
}
