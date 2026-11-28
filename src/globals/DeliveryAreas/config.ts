import type { FieldHook, GlobalConfig } from 'payload'

import { isStaff } from '@/access/isStaff'
import { duplicatePincodes, invalidPincodeTokens, parseMapPin, parsePincodes } from '@/utilities/deliveryArea'
import { revalidateDeliveryAreas } from './hooks/revalidateDeliveryAreas'

type AreaRow = { name?: null | string; pincodes?: null | string }

const PIN_HELP =
  'Latitude, longitude, for example 13.0067, 80.2570. In Google Maps, right-click the place and click the numbers at the top to copy them.'

/** An empty pin is fine; a typed one must read as a point in India. */
const validatePin = (value: unknown): string | true => {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return true
  return parseMapPin(text) ? true : 'Use latitude, longitude for a place in India, for example 13.0067, 80.2570.'
}

/** Stores the pincodes one per line, whatever separators staff typed. */
const normalizePincodes: FieldHook = ({ value }) =>
  typeof value === 'string' ? parsePincodes(value).join('\n') : value

/**
 * Where the kitchen delivers. The checkout refuses a pincode outside this list
 * while the check is ticked; /delivery-areas and the contact page show the area
 * names either way (design.md: show delivery areas clearly and early).
 */
export const DeliveryAreas: GlobalConfig = {
  slug: 'delivery-areas',
  label: 'Delivery areas',
  access: {
    read: () => true,
    update: isStaff,
  },
  admin: {
    description:
      'The areas the kitchen delivers to, each with its pincodes. Shown on /delivery-areas and the contact page.',
    group: 'Website',
  },
  fields: [
    {
      name: 'enforce',
      type: 'checkbox',
      label: 'Check pincodes at checkout',
      defaultValue: false,
      admin: {
        description:
          'When ticked, checkout refuses a pincode that is not listed below. Leave it off until the list is complete.',
      },
    },
    {
      name: 'intro',
      type: 'textarea',
      label: 'Intro line',
      defaultValue: 'We cook in Chennai and deliver to the areas below. Check your pincode to be sure.',
      admin: { description: 'The short line under the heading on /delivery-areas.' },
    },
    {
      name: 'kitchenPin',
      type: 'text',
      label: 'Kitchen on the map',
      admin: {
        description: `Optional. Leave empty and the map places the kitchen from the address in Footer → Contact. To place it exactly: ${PIN_HELP}`,
      },
      validate: validatePin,
    },
    {
      name: 'areas',
      type: 'array',
      label: 'Areas',
      labels: { singular: 'Area', plural: 'Areas' },
      defaultValue: () => [],
      admin: {
        description: 'Drag to reorder. Customers see the area names in this order.',
        components: {
          RowLabel: '@/globals/DeliveryAreas/RowLabel#RowLabel',
        },
      },
      validate: (value: unknown) => {
        const clashes = duplicatePincodes(value as AreaRow[] | null)
        if (clashes.length === 0) return true
        const [first] = clashes
        return `Pincode ${first!.pincode} is listed under ${first!.areas.join(' and ')}. Keep each pincode in one area.`
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Area name',
          required: true,
          admin: { description: 'As customers know it, for example "Adyar" or "Anna Nagar".' },
        },
        {
          name: 'pin',
          type: 'text',
          label: 'Map pin',
          admin: {
            description: `Optional. Leave empty and the map places the area from its name and pincode. To place it exactly: ${PIN_HELP}`,
          },
          validate: validatePin,
        },
        {
          name: 'pincodes',
          type: 'textarea',
          label: 'Pincodes',
          required: true,
          admin: { description: 'One or more 6-digit pincodes, separated by commas, spaces or new lines.' },
          hooks: { beforeChange: [normalizePincodes] },
          validate: (value: unknown) => {
            const text = typeof value === 'string' ? value : ''
            const invalid = invalidPincodeTokens(text)
            if (invalid.length > 0) return `${invalid[0]} is not a 6-digit pincode.`
            return parsePincodes(text).length > 0 ? true : 'Add at least one 6-digit pincode.'
          },
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateDeliveryAreas],
  },
}
