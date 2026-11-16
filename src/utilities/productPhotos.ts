import type { Media, Product } from '@/payload-types'

/** The most photos one product carries: the main photo plus four more. */
export const PRODUCT_MAX_PHOTOS = 5

const asMedia = (value: unknown): Media | null =>
  value && typeof value === 'object' && typeof (value as Media).url === 'string'
    ? (value as Media)
    : null

/**
 * A product's own photos in the order staff set them: the main photo first,
 * then its extra photos. Unpopulated or deleted uploads are skipped, so the
 * list only ever holds photos that can render.
 */
export const productPhotos = (product: Pick<Product, 'gallery' | 'image'>): Media[] =>
  [asMedia(product.image), ...(product.gallery ?? []).map((row) => asMedia(row?.image))]
    .filter((media): media is Media => media !== null)
    .slice(0, PRODUCT_MAX_PHOTOS)
