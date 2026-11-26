import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

/** With a test database every DB-backed suite boots its own Payload, which is heavy. */
const withDatabase = Boolean(process.env.TEST_DATABASE_URL)

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globalSetup: ['./tests/globalSetup.ts'],
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.{ts,tsx}'],
    // Fewer workers so the Payload boots do not starve each other, and room for a slow boot.
    ...(withDatabase ? { maxWorkers: 4, testTimeout: 20_000, hookTimeout: 180_000 } : {}),
  },
})
