/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'

import {
  AUDIENCE_FILTER_LABEL,
  AUDIENCE_FILTER_ORDER,
  AUDIENCE_LABEL,
  CATEGORY_LABEL,
  categoryBadgeAriaLabel,
  PRODUCTS_CATEGORY_CTA_BROWSE,
  PRODUCTS_CATEGORY_FINAL_BODY,
  PRODUCTS_CATEGORY_FINAL_HEADING,
  PRODUCT_CATEGORY_COPY,
  PRODUCT_CATEGORY_VALUES,
  isProductCategory,
  productCategoryHref,
  productHref,
} from '@/utilities/productsCategoryCopy'

/**
 * The shared source of the category pages (spec 0008).
 *
 * Every label the product card badges show and every word the category pages
 * render comes from this one module, so the tests hold it to the whole
 * contract: exactly three route values, a href for each, labels that never
 * drift between a badge and its page, and copy that is complete for every
 * category.
 */
describe('isProductCategory', () => {
  it('accepts exactly the three category values', () => {
    expect(isProductCategory('ready-to-cook')).toBe(true)
    expect(isProductCategory('ready-to-eat')).toBe(true)
    expect(isProductCategory('fresh-from-produce')).toBe(true)
  })

  it('refuses anything else, including product slugs and near misses', () => {
    expect(isProductCategory('lunch-plan')).toBe(false)
    expect(isProductCategory('kids')).toBe(false)
    expect(isProductCategory('')).toBe(false)
    expect(isProductCategory('READY-TO-COOK')).toBe(false)
    expect(isProductCategory('ready-to-cook ')).toBe(false)
  })
})

describe('productCategoryHref', () => {
  it('builds the address of each category page', () => {
    expect(productCategoryHref('ready-to-cook')).toBe('/products/ready-to-cook')
    expect(productCategoryHref('ready-to-eat')).toBe('/products/ready-to-eat')
    expect(productCategoryHref('fresh-from-produce')).toBe('/products/fresh-from-produce')
  })
})

describe('productHref', () => {
  it('builds the address of a product page under /products', () => {
    expect(productHref('lunch-plan')).toBe('/products/lunch-plan')
    expect(productHref('kids-plan')).toBe('/products/kids-plan')
  })
})

describe('the route values', () => {
  it('are exactly the three select options on Products', () => {
    expect(PRODUCT_CATEGORY_VALUES).toHaveLength(3)
    expect(Object.keys(CATEGORY_LABEL).sort()).toEqual([...PRODUCT_CATEGORY_VALUES].sort())
  })
})

describe('the label maps', () => {
  it('name every category and audience', () => {
    expect(CATEGORY_LABEL['ready-to-cook']).toBe('Ready to cook')
    expect(CATEGORY_LABEL['ready-to-eat']).toBe('Ready to eat')
    expect(CATEGORY_LABEL['fresh-from-produce']).toBe('Fresh from produce')

    expect(AUDIENCE_LABEL.kids).toBe('Kids')
    expect(AUDIENCE_LABEL.adults).toBe('Adults')
    expect(AUDIENCE_LABEL.special).toBe('Special')
  })

  it('give the filter pills All plus every audience, in order', () => {
    expect(AUDIENCE_FILTER_ORDER).toEqual(['all', 'kids', 'adults', 'special'])
    expect(AUDIENCE_FILTER_LABEL.all).toBe('All')
    expect(AUDIENCE_FILTER_LABEL.kids).toBe(AUDIENCE_LABEL.kids)
    expect(AUDIENCE_FILTER_LABEL.adults).toBe(AUDIENCE_LABEL.adults)
    expect(AUDIENCE_FILTER_LABEL.special).toBe(AUDIENCE_LABEL.special)
  })

  it('name the badge links after the category page they open', () => {
    expect(categoryBadgeAriaLabel('ready-to-cook')).toBe('Browse Ready to cook products')
    expect(categoryBadgeAriaLabel('fresh-from-produce')).toBe('Browse Fresh from produce products')
  })
})

describe('the per category copy', () => {
  it('is complete for every category, with nothing blank', () => {
    for (const value of PRODUCT_CATEGORY_VALUES) {
      const copy = PRODUCT_CATEGORY_COPY[value]

      expect(copy.eyebrow).toBe(CATEGORY_LABEL[value])
      expect(copy.headline.trim()).toBeTruthy()
      expect(copy.headlineAccent.trim()).toBeTruthy()
      expect(copy.intro.trim()).toBeTruthy()
      expect(copy.metaTitle.trim()).toBeTruthy()
      expect(copy.metaDescription.trim()).toBeTruthy()
    }
  })
})

describe('the shared page words', () => {
  it('carry a browse label and a closing section', () => {
    expect(PRODUCTS_CATEGORY_CTA_BROWSE.trim()).toBeTruthy()
    expect(PRODUCTS_CATEGORY_FINAL_HEADING.trim()).toBeTruthy()
    expect(PRODUCTS_CATEGORY_FINAL_BODY.trim()).toBeTruthy()
  })
})
