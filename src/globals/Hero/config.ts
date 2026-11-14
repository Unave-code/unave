import type { Field, GlobalConfig } from 'payload'

import { safeLinkHref } from '@/utilities/safeLinkHref'
import { revalidateHero } from './hooks/revalidateHero'

const galleryCard = (index: number): Field => ({
  name: `image${index}`,
  type: 'group',
  label: `Image ${index}`,
  fields: [
    {
      name: 'image',
      type: 'upload',
      label: 'Image',
      relationTo: 'media',
      admin: {
        description: 'Choose a Media item with descriptive alt text.',
      },
    },
    {
      name: 'link',
      type: 'text',
      label: 'Link URL',
      admin: {
        description: 'Optional. Use a site path such as /products or an HTTP(S) URL.',
      },
      validate: (value: unknown) => {
        if (value == null || (typeof value === 'string' && !value.trim())) return true
        return safeLinkHref(value) ? true : 'Enter a site path or an HTTP(S) URL.'
      },
    },
  ],
})

/** Uploaded banners for the image slider at the top of the home page. */
export const Hero: GlobalConfig = {
  slug: 'hero',
  label: 'Home hero',
  access: {
    read: () => true,
  },
  admin: {
    description: 'Manage the home page slider and the three linked photos shown beneath it.',
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
    {
      name: 'gallery',
      type: 'group',
      label: 'Images below the slider',
      admin: {
        description: 'Set each photo and its optional destination link.',
      },
      fields: [galleryCard(1), galleryCard(2), galleryCard(3)],
    },
  ],
  hooks: {
    afterChange: [revalidateHero],
  },
}
