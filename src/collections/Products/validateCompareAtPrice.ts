export const validateCompareAtPrice = (value: unknown, currentPrice: unknown): true | string => {
  if (value === null || value === undefined || value === '') return true

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return 'Enter a whole amount for the old price.'
  }

  if (typeof currentPrice !== 'number' || !Number.isInteger(currentPrice) || currentPrice < 1) {
    return 'Enter the current price before setting an old price.'
  }

  if (value <= currentPrice) return 'The old price must be greater than the current price.'

  return true
}
