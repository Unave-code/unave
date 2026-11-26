import { describe, expect, it } from 'vitest'

import { productJsonLd as build } from '@/utilities/structuredData'

/** The node as a plain record, so a test can read a key only some shapes carry. */
const productJsonLd = (...args: Parameters<typeof build>): Record<string, unknown> => build(...args)

const base = {
  compareAtPrice: null,
  durations: null,
  packSize: null,
  price: null,
  sizes: null,
  slug: 'ghee',
  title: 'Ghee ',
  type: 'one-time' as const,
}

const options = { available: true, description: 'Ghee from the UNAVE kitchen.', images: [] }

describe('productJsonLd', () => {
  it('prices a single item in rupees from paise, in stock, with a trimmed name', () => {
    const ld = productJsonLd({ ...base, price: 60000 }, options)

    expect(ld['@type']).toBe('Product')
    expect(ld.name).toBe('Ghee')
    expect(ld.offers).toMatchObject({
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      price: '600.00',
      priceCurrency: 'INR',
    })
  })

  it('gives one offer per size, named by the size', () => {
    const ld = productJsonLd(
      {
        ...base,
        price: 60000,
        sizes: [
          { label: '250 g', price: 15000 },
          { label: '500 g', price: 28050 },
        ],
      },
      options,
    )

    expect(ld.offers).toEqual([
      expect.objectContaining({ name: '250 g', price: '150.00' }),
      expect.objectContaining({ name: '500 g', price: '280.50' }),
    ])
  })

  it('gives a meal plan one offer per duration', () => {
    const ld = productJsonLd(
      {
        ...base,
        durations: [
          { days: 7, label: 'One week', price: 150000 },
          { days: 30, label: 'One month', price: 500000 },
        ],
        type: 'plan',
      },
      options,
    )

    expect(ld.offers).toEqual([
      expect.objectContaining({ name: 'One week', price: '1500.00' }),
      expect.objectContaining({ name: 'One month', price: '5000.00' }),
    ])
  })

  it('marks a paused product out of stock and leaves out an offer it has no price for', () => {
    expect(productJsonLd({ ...base, price: 60000 }, { ...options, available: false }).offers).toMatchObject({
      availability: 'https://schema.org/OutOfStock',
    })
    expect(productJsonLd(base, options)).not.toHaveProperty('offers')
  })

  it('lists photos as absolute addresses', () => {
    const ld = productJsonLd(
      { ...base, price: 100 },
      { ...options, images: [{ updatedAt: '2026-11-26', url: '/api/media/file/ghee.webp' }] },
    )

    expect(ld.image).toEqual([expect.stringMatching(/^https?:\/\/.+\/api\/media\/file\/ghee\.webp$/)])
  })
})
