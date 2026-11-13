import type { Product } from '@/payload-types'

export type ComboComponentSnapshot = {
  days?: number
  durationLabel?: string
  product: number
  productTitle: string
}

type PopulatedProduct = Product & { id: number | string }

const relationId = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' || typeof id === 'string' ? id : null
  }
  return null
}

export const selectedComboDuration = (
  product: Product,
  label: null | string | undefined,
) => {
  const normalized = label?.trim().toLowerCase()
  if (!normalized) return null

  const matches = (product.durations ?? []).filter(
    (duration) => duration.label.trim().toLowerCase() === normalized,
  )

  return matches.length === 1 ? matches[0] : null
}

const componentProduct = (value: unknown): PopulatedProduct | null => {
  if (
    !value ||
    typeof value !== 'object' ||
    !('id' in value) ||
    !('type' in value) ||
    !('title' in value) ||
    !('available' in value)
  ) {
    return null
  }

  return value as PopulatedProduct
}

export const comboComponents = (
  product: Product,
): ComboComponentSnapshot[] | null => {
  const components = product.components ?? []
  if (components.length < 2 || components.length > 10) return null

  const seen = new Set<string>()
  const snapshots: ComboComponentSnapshot[] = []

  for (const component of components) {
    const source = componentProduct(component.product)
    const id = relationId(component.product)
    if (!source || id === null || source.type === 'combo' || !source.available) return null
    if (seen.has(String(id))) return null
    seen.add(String(id))

    if (source.type === 'plan') {
      const duration = selectedComboDuration(source, component.durationLabel)
      if (!duration) return null
      snapshots.push({
        days: Number(duration.days),
        durationLabel: duration.label,
        product: source.id,
        productTitle: source.title,
      })
    } else {
      if (component.durationLabel?.trim()) return null
      snapshots.push({ product: source.id, productTitle: source.title })
    }
  }

  return snapshots
}

export const isProductSellable = (product: Product): boolean =>
  product.available === true && (product.type !== 'combo' || comboComponents(product) !== null)
