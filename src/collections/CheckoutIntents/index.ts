import type { CollectionConfig } from 'payload'

export const CheckoutIntents: CollectionConfig = {
  slug: 'checkout-intents',
  access: {
    create: () => false,
    delete: () => false,
    read: () => false,
    update: () => false,
  },
  admin: {
    hidden: true,
    useAsTitle: 'gatewayOrderId',
  },
  fields: [
    {
      name: 'gatewayOrderId',
      type: 'text',
      index: true,
      required: true,
      unique: true,
    },
    { name: 'customer', type: 'relationship', relationTo: 'customers', required: true },
    {
      name: 'delivery',
      type: 'group',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'phone', type: 'text', required: true },
        { name: 'addressLine1', type: 'text', required: true },
        { name: 'addressLine2', type: 'text' },
        { name: 'city', type: 'text', required: true },
        { name: 'state', type: 'text', required: true },
        { name: 'pincode', type: 'text', required: true },
        { name: 'foodPreference', type: 'text', required: true },
        { name: 'note', type: 'textarea' },
      ],
      required: true,
    },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      fields: [
        { name: 'productRef', type: 'relationship', relationTo: 'products' },
        { name: 'productId', type: 'number', required: true },
        { name: 'productTitle', type: 'text', required: true },
        { name: 'durationLabel', type: 'text', required: true },
        { name: 'days', type: 'number', required: true },
        { name: 'qty', type: 'number', required: true, min: 1 },
        { name: 'unitPrice', type: 'number', required: true, min: 1 },
        {
          name: 'components',
          type: 'array',
          fields: [
            { name: 'productRef', type: 'relationship', relationTo: 'products' },
            { name: 'productId', type: 'number', required: true },
            { name: 'productTitle', type: 'text', required: true },
            { name: 'durationLabel', type: 'text' },
            { name: 'days', type: 'number' },
          ],
        },
      ],
      required: true,
    },
    { name: 'total', type: 'number', required: true, min: 1 },
    { name: 'expiresAt', type: 'date', index: true, required: true },
  ],
  graphQL: false,
  timestamps: true,
}
