/**
 * Cash on delivery at checkout (spec 2026-11-28). The page decides whether to
 * show the choice; the cash endpoint decides again, so this is a courtesy, not
 * the gate.
 */

export type CodSettings = {
  enabled: boolean
  /** Paise; null means no limit. */
  maxTotal: null | number
}

export const codOffered = (cod: CodSettings, total: number): boolean =>
  cod.enabled && (cod.maxTotal === null || total <= cod.maxTotal)

/** What `/api/orders/cash` answers on success. */
export const readCashOrder = (body: unknown): { orderId: number | string } | null => {
  if (!body || typeof body !== 'object') return null

  const { orderId } = body as Record<string, unknown>

  return typeof orderId === 'number' || typeof orderId === 'string' ? { orderId } : null
}
