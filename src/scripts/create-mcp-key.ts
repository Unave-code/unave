import { randomBytes } from 'node:crypto'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

/**
 * Create an MCP API key so an MCP client can talk to /api/mcp.
 *
 * Run with `npx payload run ./src/scripts/create-mcp-key.ts`. Payload encrypts
 * keys at rest and never returns them, so the plaintext prints exactly once,
 * here — the only copy that will ever exist. Lose it and you rotate: delete
 * the row in the admin under MCP → API Keys and run this again.
 *
 * The key belongs to the first staff user and starts with every capability the
 * plugin exposes switched on; switch any off on the row in the admin and the
 * client loses that access the moment it saves. The row is found by label, so
 * a key that still exists is never silently duplicated.
 */

const KEY_LABEL = 'OpenCode dev'

const payload = await getPayload({ config: configPromise })

const existing = await payload.find({
  collection: 'payload-mcp-api-keys',
  limit: 1,
  overrideAccess: true,
  where: { label: { equals: KEY_LABEL } },
})

if (existing.docs.length > 0) {
  console.log(
    JSON.stringify({
      error: `An API key labeled "${KEY_LABEL}" already exists (row ${existing.docs[0].id}). Its value can never be read back. Delete the row and run this script again to rotate.`,
    }),
  )
  process.exit(1)
}

const users = await payload.find({
  collection: 'users',
  limit: 1,
  overrideAccess: true,
  sort: 'createdAt',
})

const owner = users.docs[0]

if (!owner) throw new Error('No staff user exists yet — create one in the admin first.')

// Payload stores the key encrypted and matches a presented Bearer token
// against the stored index, so the plaintext matters only right here.
const apiKey = randomBytes(32).toString('base64url')

await payload.create({
  collection: 'payload-mcp-api-keys',
  data: {
    apiKey,
    description: 'MCP access for the OpenCode agent during development.',
    enableAPIKey: true,
    label: KEY_LABEL,
    // The capability checkboxes default to false on every new key — the admin
    // UI toggles them, and so does this script, per collection and global.
    categories: { find: true },
    customers: { find: true },
    enquiries: { find: true },
    footer: { find: true },
    header: { find: true },
    hero: { find: true },
    media: { create: true, find: true },
    orderRequests: { find: true },
    orders: { find: true },
    pages: { find: true },
    posts: { find: true },
    products: { create: true, find: true, update: true },
    subcategories: { create: true, find: true, update: true },
    user: owner.id,
  },
  overrideAccess: true,
})

console.log(JSON.stringify({ key: apiKey }))
