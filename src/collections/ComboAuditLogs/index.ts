import type { CollectionConfig } from 'payload'

import { isStaff } from '@/access/isStaff'

export const ComboAuditLogs: CollectionConfig = {
  slug: 'combo-audit-logs',
  access: {
    create: () => false,
    delete: () => false,
    read: isStaff,
    update: () => false,
  },
  admin: {
    defaultColumns: ['action', 'combo', 'actor', 'createdAt'],
    group: 'Store',
    useAsTitle: 'id',
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
  labels: {
    plural: 'Combo audit logs',
    singular: 'Combo audit log',
  },
  timestamps: true,
}
