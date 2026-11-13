import type { CollectionBeforeChangeHook } from 'payload'

import type { Product } from '@/payload-types'

export const prepareComboComponents: CollectionBeforeChangeHook<Product> = async ({
  data,
  originalDoc,
  req,
}) => {
  const type = data.type ?? originalDoc?.type
  const rows = data.components ?? originalDoc?.components
  if (type !== 'combo' || !Array.isArray(rows)) return data

  const components = await Promise.all(
    rows.map(async (component) => {
      const id =
        typeof component.product === 'object' && component.product !== null
          ? component.product.id
          : component.product

      if (typeof id !== 'number' && typeof id !== 'string') return component

      const product = await req.payload.findByID({
        collection: 'products',
        depth: 0,
        id,
        overrideAccess: true,
      })

      if (product.type === 'combo') return component

      if (product.type !== 'plan') {
        return {
          ...component,
          durationLabel: '',
          durationDaysSnapshot: null,
          productTitleSnapshot: product.title,
        }
      }

      const selectedLabel = component.durationLabel?.trim().toLowerCase()
      const matches = (product.durations ?? []).filter(
        (duration) => duration.label.trim().toLowerCase() === selectedLabel,
      )
      const duration = matches.length === 1 ? matches[0] : undefined

      return {
        ...component,
        durationLabel: duration?.label ?? component.durationLabel,
        durationDaysSnapshot: duration?.days ?? component.durationDaysSnapshot,
        productTitleSnapshot: product.title,
      }
    }),
  )

  return {
    ...data,
    compareAtPrice: null,
    components,
    durations: [],
    packSize: null,
  }
}
