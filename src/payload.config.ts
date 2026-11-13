import { postgresAdapter } from '@payloadcms/db-postgres'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { CheckoutIntents } from './collections/CheckoutIntents'
import { ComboAuditLogs } from './collections/ComboAuditLogs'
import { Customers } from './collections/Customers'
import { EmailLog } from './collections/EmailLog'
import { Enquiries } from './collections/Enquiries'
import { Media } from './collections/Media'
import { OrderRequests } from './collections/OrderRequests'
import { Orders } from './collections/Orders'
import { Pages } from './collections/Pages'
import { Products } from './collections/Products'
import { Posts } from './collections/Posts'
import { Subcategories } from './collections/Subcategories'
import { Users } from './collections/Users'
import { unaveEmailAdapter } from './email/adapter'
import { emailTestEndpoint } from './endpoints/emailTest'
import { Footer } from './Footer/config'
import { EmailSettings } from './globals/EmailSettings'
import { Hero } from './globals/Hero/config'
import { Header } from './Header/config'
import { pruneEmailLogTask } from './jobs/pruneEmailLog'
import { cleanupCheckoutIntentsTask } from './jobs/cleanupCheckoutIntents'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeLogin: ['@/components/BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeDashboard: ['@/components/BeforeDashboard'],
      graphics: {
        Icon: '@/components/AdminIcon',
        Logo: '@/components/AdminLogo',
      },
      // The nav's bottom controls hold no user control any more — the staff
      // chip lives in the header's top-right corner instead (admin.avatar).
      logout: {
        Button: '@/components/Admin/NoSidebarLogout',
      },
    },
    /**
     * The header's top-right slot renders the staff user menu — initials,
     * name, and a menu with the account page and sign out
     * (`src/components/Admin/UserMenu`). Payload's default here is a
     * gravatar.com image with no fallback, which renders as an empty box
     * whenever the network cannot reach it.
     */
    avatar: {
      Component: '@/components/Admin/UserMenu',
    },
    /**
     * The modular dashboard (experimental upstream): three desk widgets above
     * the collection cards, so the day's numbers are the first thing staff
     * see. Users can rearrange their own dashboard; defaultLayout is only the
     * first-visit arrangement.
     */
    dashboard: {
      defaultLayout: [
        { widgetSlug: 'unave-orders-today', width: 'small' },
        { widgetSlug: 'unave-open-requests', width: 'small' },
        { widgetSlug: 'unave-enquiries', width: 'small' },
        { widgetSlug: 'collections', width: 'full' },
      ],
      widgets: [
        {
          Component: '@/components/Admin/Widgets/OrdersToday',
          maxWidth: 'medium',
          minWidth: 'x-small',
          slug: 'unave-orders-today',
        },
        {
          Component: '@/components/Admin/Widgets/OpenRequests',
          maxWidth: 'medium',
          minWidth: 'x-small',
          slug: 'unave-open-requests',
        },
        {
          Component: '@/components/Admin/Widgets/UnhandledEnquiries',
          maxWidth: 'medium',
          minWidth: 'x-small',
          slug: 'unave-enquiries',
        },
      ],
    },
    theme: 'dark',
    meta: {
      description: 'Unave admin, content and enquiries',
      icons: [
        {
          rel: 'icon',
          type: 'image/png',
          url: '/favicon-192.png',
        },
      ],
      titleSuffix: '| Unave',
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  /**
   * The canonical site URL. Payload uses it for the admin's own metadata — the
   * `og:image` and absolute links — and for anything it has to name in full.
   * Without it the admin falls back to `http://localhost:3000` in production,
   * which is where the admin's social preview pointed before this. The same
   * value already drives CORS below and the sitemaps, so there is one source:
   * `NEXT_PUBLIC_SERVER_URL`, baked at build time (design.md §6.16).
   */
  serverURL: getServerSideURL(),
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  collections: [
    Pages,
    Posts,
    Media,
    Categories,
    CheckoutIntents,
    ComboAuditLogs,
    Users,
    Customers,
    Enquiries,
    EmailLog,
    Orders,
    OrderRequests,
    Products,
    Subcategories,
  ],
  cors: [getServerSideURL()].filter(Boolean),
  email: unaveEmailAdapter,
  endpoints: [emailTestEndpoint],
  globals: [Header, Footer, Hero, EmailSettings],
  plugins,
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [cleanupCheckoutIntentsTask, pruneEmailLogTask],
  },
})
