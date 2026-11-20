import type { Product } from '@/payload-types'
import { hasComboItems, isSingleItem } from '@/utilities/productKind'
import { relationId } from './relationId'

export type ComboComponentSnapshot = {
  days?: number
  durationLabel?: string
  product: number
  productTitle: string
}

type PopulatedProduct = Product & { id: number | string }

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
  if (components.length < 1 || components.length > 10) return null

  const seen = new Set<string>()
  const snapshots: ComboComponentSnapshot[] = []

  for (const component of components) {
    const source = componentProduct(component.product)
    const id = relationId(component.product)
    // Only single items go inside a combo.
    if (!source || id === null || !isSingleItem(source) || !source.available) return null
    if (seen.has(String(id))) return null
    seen.add(String(id))

    snapshots.push({ product: source.id, productTitle: source.title })
  }

  return snapshots
}

export const isProductSellable = (product: Product): boolean =>
  product.available === true && (!hasComboItems(product) || comboComponents(product) !== null)

/**
 * What a combo's items would cost bought one by one, in paise. The items must
 * be populated (depth 1 or more). Answers `null` for a meal plan combo, which
 * is priced by duration, and when any item can no longer be priced, so a
 * saving is never worked out from half a combo.
 */
export const comboSeparatePrice = (product: Product): null | number => {
  if (product.type !== 'combo') return null

  const components = product.components ?? []
  if (components.length < 1) return null

  let sum = 0

  for (const component of components) {
    const source = componentProduct(component.product)
    if (!source || !isSingleItem(source)) return null

    const price = Number(source.price)
    if (!Number.isFinite(price) || price < 1) return null
    sum += price
  }

  return sum
}

/**
 * How much a combo saves against buying its items one by one, in paise, or 0
 * when it saves less than a rupee or the saving cannot be worked out.
 */
export const comboSavingPaise = (product: Product): number => {
  const separate = comboSeparatePrice(product)
  const price = Number(product.price)
  if (separate === null || !Number.isFinite(price) || price < 1) return 0
  const saving = separate - price
  return saving >= 100 ? saving : 0
}

/** The names of what a combo holds, in order, for a one-line summary. */
export const comboItemTitles = (product: Product): string[] =>
  (product.components ?? [])
    .map((component) => {
      const source = componentProduct(component.product)
      return (source?.title ?? component.productTitleSnapshot ?? '').trim()
    })
    .filter((title) => title.length > 0)

/**
 * Why a combo cannot be sold right now, in the kitchen's words, or an empty
 * list when it can. The items must be populated (depth 1 or more). This is the
 * reason behind `isProductSellable` turning a combo off, spelled out for the
 * admin, so a combo never goes quiet without anyone knowing why.
 */
export const comboProblems = (product: Product): string[] => {
  if (!hasComboItems(product)) return []

  const components = product.components ?? []
  const problems: string[] = []

  if (components.length < 1) problems.push('A combo needs at least one item.')
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

    if (hasComboItems(source))
      problems.push(`${name} is a combo; a combo cannot hold another combo.`)
    else if (!isSingleItem(source))
      problems.push(`${name} is a meal plan; only single items go inside a combo.`)
    if (!source.available) problems.push(`${name} is paused, so the combo cannot be bought.`)
  })

  return problems
}
