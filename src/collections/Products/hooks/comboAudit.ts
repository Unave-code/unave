import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  Payload,
  PayloadRequest,
} from 'payload'

import type { Product } from '@/payload-types'
import { hasStaffRole } from '@/access/isStaff'

type ComboSnapshot = {
  audience?: null | string
  available?: boolean | null
  category?: null | string
  components: Array<{
    days?: null | number
    durationLabel?: null | string
    productId: number | string | null
    productTitle: string
  }>
  description?: Product['description']
  featured?: boolean | null
  image: number | string | null
  price?: null | number
  slug?: string
  subcategory: number | string | null
  title?: string
}

const relationId = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' || typeof id === 'string' ? id : null
  }
  return null
}

const snapshot = async (
  product: Product,
  payload: Payload,
): Promise<ComboSnapshot> => {
  const components = await Promise.all(
    (product.components ?? []).map(async (component) => {
      const productId = relationId(component.product)
      const sourceResult = productId
        ? await payload.find({
            collection: 'products',
            depth: 0,
            limit: 1,
            overrideAccess: true,
            where: { id: { equals: productId } },
          })
        : null
      const source = sourceResult?.docs[0] as Product | undefined
      const durationLabel = component.durationLabel?.trim() || null
      const duration = source?.durations?.find(
        (item) => item.label.trim().toLowerCase() === durationLabel?.toLowerCase(),
      )

      return {
        days: duration?.days ?? component.durationDaysSnapshot ?? null,
        durationLabel,
        productId,
        productTitle: source?.title ?? component.productTitleSnapshot ?? 'Deleted product',
      }
    }),
  )

  return {
    audience: product.audience,
    available: product.available,
    category: product.category,
    components,
    description: product.description,
    featured: product.featured,
    image: relationId(product.image),
    price: product.price,
    slug: product.slug,
    subcategory: relationId(product.subcategory),
    title: product.title,
  }
}

const writeAudit = async ({
  after,
  before,
  comboId,
  req,
  action,
}: {
  action: 'created' | 'deleted' | 'updated'
  after: ComboSnapshot | null
  before: ComboSnapshot | null
  comboId: number | null
  req: PayloadRequest
}): Promise<void> => {
  const actorId = req.user?.id

  if (!hasStaffRole(req.user) || actorId === undefined) {
    throw new Error('A staff actor is required to record combo changes.')
  }

  await req.payload.create({
    collection: 'combo-audit-logs',
    data: {
      action,
      actor: actorId,
      after,
      before,
      combo: comboId,
    },
    depth: 0,
    overrideAccess: true,
    req,
  })
}

export const auditComboChange: CollectionAfterChangeHook<Product> = async ({
  doc,
  operation,
  previousDoc,
  req,
}) => {
  if (doc.type !== 'combo' && previousDoc?.type !== 'combo') return doc

  await writeAudit({
    action: operation === 'create' ? 'created' : 'updated',
    after: doc.type === 'combo' ? await snapshot(doc, req.payload) : null,
    before: previousDoc?.type === 'combo' ? await snapshot(previousDoc, req.payload) : null,
    comboId: doc.id,
    req,
  })

  return doc
}

export const auditComboDelete: CollectionAfterDeleteHook<Product> = async ({ doc, req }) => {
  if (doc.type !== 'combo') return doc

  // The combo row is already gone, so the audit record cannot point at it. The
  // before snapshot still names the combo and its contents.
  await writeAudit({
    action: 'deleted',
    after: null,
    before: await snapshot(doc, req.payload),
    comboId: null,
    req,
  })

  return doc
}
