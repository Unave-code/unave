import type { Payload } from 'payload'

/**
 * The id of an audience by slug, created when the test database has none yet.
 * Audiences are a list staff manage, and every product needs one. Suites run in
 * parallel, so two can try to create the same audience at once; the one that
 * loses the unique slug reads the winner's row instead.
 */
export const testAudienceId = async (
  payload: Payload,
  slug = 'adults',
  title = slug.charAt(0).toUpperCase() + slug.slice(1),
): Promise<number> => {
  const find = async () =>
    (
      await payload.find({
        collection: 'audiences',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        where: { slug: { equals: slug } },
      })
    ).docs[0]?.id

  const existing = await find()
  if (existing !== undefined) return existing

  try {
    const created = await payload.create({
      collection: 'audiences',
      data: { slug, title },
      overrideAccess: true,
    })
    return created.id
  } catch (error) {
    const raced = await find()
    if (raced !== undefined) return raced
    throw error
  }
}
