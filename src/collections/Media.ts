import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'

import { anyone } from '../access/anyone'
import { isStaff } from '../access/isStaff'
import { compressUploadedVideo } from '../hooks/compressUploadedVideo'

/* Every stored image is WebP at quality 80: a fraction of a JPEG or PNG's
   weight at no visible cost. Payload formats the original and each size
   separately, so each size names it too. */
const WEBP = { format: 'webp', options: { quality: 80 } } as const

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Catalogue',
  },
  folders: true,
  access: {
    create: isStaff,
    delete: isStaff,
    read: anyone,
    update: isStaff,
  },
  hooks: {
    beforeOperation: [compressUploadedVideo],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      //required: true,
    },
    {
      name: 'caption',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
  ],
  upload: {
    // Upload to the public/media directory in Next.js making them publicly accessible even outside of Payload
    staticDir: path.resolve(dirname, '../../public/media'),
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    /* Compression on upload. The original is capped at 2400px on its longer
       side (never enlarged) and converted to WebP, so a 6 MB phone photo is
       stored at a few hundred KB. Videos are re-encoded by the
       compressUploadedVideo hook above. */
    resizeOptions: { fit: 'inside', height: 2400, width: 2400, withoutEnlargement: true },
    formatOptions: WEBP,
    imageSizes: [
      {
        name: 'thumbnail',
        formatOptions: WEBP,
        width: 300,
      },
      {
        name: 'square',
        formatOptions: WEBP,
        width: 500,
        height: 500,
      },
      {
        name: 'small',
        formatOptions: WEBP,
        width: 600,
      },
      {
        name: 'medium',
        formatOptions: WEBP,
        width: 900,
      },
      {
        name: 'large',
        formatOptions: WEBP,
        width: 1400,
      },
      {
        name: 'xlarge',
        formatOptions: WEBP,
        width: 1920,
      },
      {
        /* For emails: Outlook for Windows cannot show WebP, so emails use this
           PNG instead (src/email/design.ts). Twice the email column's 456px,
           never enlarged; a palette PNG keeps photos to a reasonable weight. */
        name: 'email',
        formatOptions: { format: 'png', options: { compressionLevel: 9, palette: true, quality: 80 } },
        width: 912,
        withoutEnlargement: true,
      },
      {
        name: 'og',
        formatOptions: WEBP,
        width: 1200,
        height: 630,
        crop: 'center',
      },
    ],
  },
}
