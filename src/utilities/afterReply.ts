import { after } from 'next/server'

/**
 * Runs `work` once the response has gone, so a slow mail server never holds a
 * reply. Outside a Next request (a direct call in a test) there is no response
 * to wait for, so the work simply starts without being awaited.
 */
export const runAfterReply = (work: () => Promise<void>): void => {
  try {
    after(work)
  } catch {
    void work()
  }
}
