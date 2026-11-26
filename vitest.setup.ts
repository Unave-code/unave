import dotenv from 'dotenv'
import { afterAll } from 'vitest'

import { applyTestDatabase } from './tests/testEnv'

applyTestDatabase()
dotenv.config()

type CachedPayload = { payload: null | { destroy: () => Promise<void> } }

/**
 * Close any Payload a suite booted, and with it the database pool. A worker
 * holding an open pool never exits, and the next worker then times out starting.
 */
afterAll(async () => {
  const cache = (globalThis as { _payload?: Map<string, CachedPayload> })._payload
  if (!cache) return
  for (const entry of cache.values()) {
    await entry.payload?.destroy().catch(() => undefined)
  }
  cache.clear()
})
