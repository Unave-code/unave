import type { Payload } from 'payload'

/**
 * The id of an audience by slug, created when the test database has none yet.
 * Audiences are a list staff manage, and every product needs one.
 */
export const testAudienceId = async (
  payload: Payload,
  slug = 'adults',
  title = slug.charAt(0).toUpperCase() + slug.slice(1),
): Promise<number> => {
  const found = await payload.find({
    collection: 'audiences',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: slug } },
  })

  if (found.docs[0]) return found.docs[0].id

  const created = await payload.create({
    collection: 'audiences',
    data: { slug, title },
    overrideAccess: true,
  })

  return created.id
}
