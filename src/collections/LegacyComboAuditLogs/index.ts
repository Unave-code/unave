import type { CollectionConfig } from 'payload'

// Keep the table in the development schema so sync does not drop its archived rows.
export const LegacyComboAuditLogs: CollectionConfig = {
  slug: 'combo-audit-logs',
  access: {
    create: () => false,
    delete: () => false,
    read: () => false,
    update: () => false,
  },
  admin: {
    hidden: true,
  },
  fields: [
    { name: 'actor', type: 'relationship', relationTo: 'users', required: true },
    {
      name: 'action',
      type: 'select',
      options: [
        { label: 'Created', value: 'created' },
        { label: 'Updated', value: 'updated' },
        { label: 'Deleted', value: 'deleted' },
      ],
      required: true,
    },
    { name: 'combo', type: 'relationship', relationTo: 'products' },
    { name: 'before', type: 'json' },
    { name: 'after', type: 'json' },
  ],
  graphQL: false,
  timestamps: true,
}
