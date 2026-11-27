import { withPayload } from '@payloadcms/next/withPayload'
import { withSentryConfig } from '@sentry/nextjs/config'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)
import { redirects } from './redirects'

const NEXT_PUBLIC_SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL
  ? process.env.NEXT_PUBLIC_SERVER_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000'

/**
 * Headers on every response. Kept to the ones that cannot break a page:
 * the site is never framed by another origin (the admin's live preview frames
 * it from the same origin), the browser never guesses a content type, other
 * sites get the origin and not the full address, and the device features this
 * site never uses are off. HSTS is production only, so `next dev` over plain
 * http keeps working.
 */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
  },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), usb=(), browsing-topics=()',
  },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
    : []),
]

const nextConfig: NextConfig = {
  // Do not advertise the framework in every response.
  poweredByHeader: false,
  async headers() {
    return [{ headers: securityHeaders, source: '/:path*' }]
  },
  // A self contained server.js for the Docker image (docs/deploy.md). `next
  // start` and `next dev` are unaffected.
  output: 'standalone',
  // Temporarily required on Windows until Next.js fixes Turbopack Sass resolution.
  // See: https://github.com/vercel/next.js/issues/86431
  sassOptions: {
    loadPaths: ['./node_modules/@payloadcms/ui/dist/scss/'],
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
      {
        // Placeholder photography shipped in /public until the real shoot lands.
        pathname: '/images/**',
      },
    ],
    qualities: [75],
    remotePatterns: [
      ...[NEXT_PUBLIC_SERVER_URL /* 'https://example.com' */].map((item) => {
        const url = new URL(item)

        return {
          hostname: url.hostname,
          protocol: url.protocol.replace(':', '') as 'http' | 'https',
        }
      }),
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  experimental: {
    // Two root layouts ((frontend), (payload)) leave no app/not-found to compose a
    // 404 from; app/global-not-found.tsx serves unmatched URLs with full SSR HTML.
    globalNotFound: true,
    // Each build worker loads Payload; one per core (11 here) ran out of memory
    // and crashed with "Jest worker encountered 2 child process exceptions".
    cpus: 4,
  },
  reactStrictMode: true,
  redirects,
  turbopack: {
    root: path.resolve(dirname),
  },
}

/**
 * Sentry wraps the config for source maps. They upload only when
 * SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT are set at build time;
 * without them the build is unchanged and stack traces stay minified. The maps
 * are deleted after upload, so the browser never gets them.
 */
export default withSentryConfig(withPayload(nextConfig, { devBundleServerPackages: false }), {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: true,
  },
  telemetry: false,
  widenClientFileUpload: true,
})
