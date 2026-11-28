import { describe, expect, it } from 'vitest'

import { DeliveryAreas } from '@/globals/DeliveryAreas/config'
import {
  areaForPincode,
  deliveryCheck,
  duplicatePincodes,
  invalidPincodeTokens,
  parsePincodes,
  readDeliveryAreas,
} from '@/utilities/deliveryArea'
import { kitchenJsonLd } from '@/utilities/structuredData'

/**
 * Delivery areas (admin → Website → Delivery areas): the pincode rules the
 * checkout, the account form and /delivery-areas share, the admin's own checks,
 * and the areas the kitchen's structured data names.
 */

const source = {
  areas: [
    { name: 'Adyar', pincodes: '600020, 600041' },
    { name: ' Anna Nagar ', pincodes: '600040\n600102' },
    { name: '', pincodes: '600001' },
  ],
  enforce: true,
}

describe('parsePincodes', () => {
  it('reads pincodes separated by commas, spaces or new lines, once each', () => {
    expect(parsePincodes('600020, 600041\n600020 600042;600043')).toEqual(['600020', '600041', '600042', '600043'])
  })

  it('ignores anything that is not six digits', () => {
    expect(parsePincodes('60002 6000200 abc 600020')).toEqual(['600020'])
    expect(parsePincodes(null)).toEqual([])
  })
})

describe('invalidPincodeTokens', () => {
  it('names what staff typed that is not a pincode', () => {
    expect(invalidPincodeTokens('600020, 60002, Adyar\n600041')).toEqual(['60002', 'Adyar'])
    expect(invalidPincodeTokens(' 600020 ,\n')).toEqual([])
  })
})

describe('readDeliveryAreas and areaForPincode', () => {
  it('keeps named areas, trimmed, and drops a row with no name', () => {
    expect(readDeliveryAreas(source).map((area) => area.name)).toEqual(['Adyar', 'Anna Nagar'])
  })

  it('finds the area a pincode belongs to', () => {
    const areas = readDeliveryAreas(source)
    expect(areaForPincode(areas, ' 600102 ')?.name).toBe('Anna Nagar')
    expect(areaForPincode(areas, '600099')).toBeNull()
  })
})

describe('deliveryCheck', () => {
  it('says served or not served while the check is on', () => {
    expect(deliveryCheck(source, '600041')).toBe('served')
    expect(deliveryCheck(source, '600099')).toBe('not-served')
  })

  it('never refuses while the check is off', () => {
    expect(deliveryCheck({ ...source, enforce: false }, '600099')).toBe('unchecked')
  })

  it('never refuses while no area has a pincode, so an empty list cannot block every order', () => {
    expect(deliveryCheck({ areas: [], enforce: true }, '600099')).toBe('unchecked')
    expect(deliveryCheck({ areas: [{ name: 'Adyar', pincodes: '' }], enforce: true }, '600099')).toBe('unchecked')
    expect(deliveryCheck(null, '600099')).toBe('unchecked')
  })

  it('does not count a pincode under an unnamed row as served', () => {
    expect(deliveryCheck(source, '600001')).toBe('not-served')
  })
})

describe('duplicatePincodes', () => {
  it('names a pincode listed under two areas', () => {
    expect(
      duplicatePincodes([
        { name: 'Adyar', pincodes: '600020' },
        { name: 'Besant Nagar', pincodes: '600090, 600020' },
      ]),
    ).toEqual([{ areas: ['Adyar', 'Besant Nagar'], pincode: '600020' }])
  })

  it('is empty when every pincode sits in one area', () => {
    expect(duplicatePincodes(source.areas)).toEqual([])
  })
})

describe('the delivery areas global', () => {
  type Validate = (value: unknown, options?: unknown) => string | true
  const fields = DeliveryAreas.fields as unknown as {
    fields?: { name: string; validate?: Validate; hooks?: { beforeChange?: ((args: { value: unknown }) => unknown)[] } }[]
    name: string
    validate?: Validate
  }[]
  const areasField = fields.find((field) => field.name === 'areas')!
  const pincodesField = areasField.fields!.find((field) => field.name === 'pincodes')!

  it('is public to read and starts with the checkout check off', () => {
    expect(DeliveryAreas.slug).toBe('delivery-areas')
    expect((DeliveryAreas.access!.read as () => boolean)()).toBe(true)
    expect(fields.find((field) => field.name === 'enforce')).toMatchObject({ defaultValue: false })
  })

  it('refuses a pincode listed under two areas, naming both', () => {
    const message = areasField.validate!([
      { name: 'Adyar', pincodes: '600020' },
      { name: 'Besant Nagar', pincodes: '600020' },
    ])
    expect(message).toBe('Pincode 600020 is listed under Adyar and Besant Nagar. Keep each pincode in one area.')
    expect(areasField.validate!(source.areas)).toBe(true)
  })

  it('refuses a token that is not a pincode, and an empty list', () => {
    expect(pincodesField.validate!('600020, 6000')).toBe('6000 is not a 6-digit pincode.')
    expect(pincodesField.validate!('  ')).toBe('Add at least one 6-digit pincode.')
    expect(pincodesField.validate!('600020,600041')).toBe(true)
  })

  it('stores the pincodes one per line', () => {
    const normalize = pincodesField.hooks!.beforeChange![0]!
    expect(normalize({ value: '600020, 600041 600020' })).toBe('600020\n600041')
  })
})

describe('kitchenJsonLd areaServed', () => {
  it('serves the city while no area is listed', () => {
    expect(kitchenJsonLd(undefined).areaServed).toEqual({ '@type': 'City', name: 'Chennai' })
  })

  it('names each delivery area inside the city', () => {
    expect(kitchenJsonLd(undefined, ['Adyar', 'Anna Nagar']).areaServed).toEqual([
      { '@type': 'Place', containedInPlace: { '@type': 'City', name: 'Chennai' }, name: 'Adyar, Chennai' },
      { '@type': 'Place', containedInPlace: { '@type': 'City', name: 'Chennai' }, name: 'Anna Nagar, Chennai' },
    ])
  })
})
