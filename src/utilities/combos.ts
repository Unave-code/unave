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

export const selectedComboDuration = (product: Product, label: null | string | undefined) => {
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

export const comboComponents = (product: Product): ComboComponentSnapshot[] | null => {
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

/**
 * What a combo's items would cost bought one by one, in paise: each one-time
 * item at its price and each meal plan at the duration the combo names. The
 * items must be populated (depth 1 or more). Answers `null` when any item can
 * no longer be priced, so a saving is never worked out from half a combo.
 */
export const comboSeparatePrice = (product: Product): null | number => {
  if (product.type !== 'combo') return null

  const components = product.components ?? []
  if (components.length < 2) return null

  let sum = 0

  for (const component of components) {
    const source = componentProduct(component.product)
    if (!source || source.type === 'combo') return null

    if (source.type === 'plan') {
      const duration = selectedComboDuration(source, component.durationLabel)
      const price = Number(duration?.price)
      if (!duration || !Number.isFinite(price) || price < 1) return null
      sum += price
    } else {
      const price = Number(source.price)
      if (!Number.isFinite(price) || price < 1) return null
      sum += price
    }
  }

  return sum
}

/**
 * Why a combo cannot be sold right now, in the kitchen's words, or an empty
 * list when it can. The items must be populated (depth 1 or more). This is the
 * reason behind `isProductSellable` turning a combo off, spelled out for the
 * admin, so a combo never goes quiet without anyone knowing why.
 */
export const comboProblems = (product: Product): string[] => {
  if (product.type !== 'combo') return []

  const components = product.components ?? []
  const problems: string[] = []

  if (components.length < 2) problems.push('A combo needs at least two items.')
  if (components.length > 10) problems.push('A combo can hold at most ten items.')

  const seen = new Set<string>()

  components.forEach((component, index) => {
    const id = relationId(component.product)
    const source = componentProduct(component.product)
    const name = source?.title ?? component.productTitleSnapshot ?? `Item ${index + 1}`

    if (id === null || !source) {
      problems.push(`${name} no longer exists. Remove it or pick another product.`)
      return
    }
    if (seen.has(String(id))) problems.push(`${name} is in the combo twice.`)
    seen.add(String(id))

    if (source.type === 'combo')
      problems.push(`${name} is a combo; a combo cannot hold another combo.`)
    if (!source.available) problems.push(`${name} is paused, so the combo cannot be bought.`)
    if (source.type === 'plan' && !selectedComboDuration(source, component.durationLabel)) {
      problems.push(
        `${name} no longer has the duration "${component.durationLabel ?? ''}". Choose one of its current durations.`,
      )
    }
  })

  return problems
}
