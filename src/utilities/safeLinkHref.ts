export const safeLinkHref = (value: unknown): string | null => {
  if (typeof value !== 'string') return null

  const href = value.trim()
  if (!href || href.length > 2048 || /[\u0000-\u001f\u007f\\]/.test(href)) return null
  if (href.startsWith('/') && !href.startsWith('//')) return href

  try {
    const url = new URL(href)
    if (url.protocol === 'http:' || url.protocol === 'https:') return href
  } catch {
    return null
  }

  return null
}
