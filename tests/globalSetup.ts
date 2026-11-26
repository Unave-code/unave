import dotenv from 'dotenv'

import { applyTestDatabase } from './testEnv'

/**
 * Builds the test database's schema once, before the suites start. Every suite
 * boots Payload, which pushes the schema on first connect; on an empty database
 * the parallel suites would all try to create the same tables at once.
 */
export default async function setup(): Promise<void> {
  if (!applyTestDatabase()) return
  dotenv.config()

  const { getPayload } = await import('payload')
  const { default: config } = await import('@payload-config')
  const payload = await getPayload({ config })
  await payload.destroy()
}
