import type { Payload } from 'payload'

/**
 * Last-resort cleanup for an int spec that seeds products in the shared dev
 * database: delete every product whose slug starts with this run's prefix.
 *
 * Per-record cleanup in these specs is best effort and silent, and when it
 * failed the leftovers piled up on the real shelf (27 found on 2026-11-14).
 * This sweep catches whatever slipped through and says so when it cannot.
 */
export const sweepRun = async (payload: Payload, run: string): Promise<void> => {
  try {
    const left = await payload.find({
      collection: 'products',
      depth: 0,
      limit: 500,
      overrideAccess: true,
      pagination: false,
      where: { slug: { like: run } },
    })

    for (const doc of left.docs) {
      if (!String(doc.slug).startsWith(run)) continue
      try {
        await payload.delete({
          collection: 'products',
          context: { disableRevalidate: true },
          id: doc.id,
          overrideAccess: true,
        })
      } catch (error) {
        console.warn(`[sweepRun] could not delete product ${doc.slug}:`, (error as Error).message)
      }
    }
  } catch (error) {
    console.warn(`[sweepRun] sweep for ${run} failed:`, (error as Error).message)
  }
}
