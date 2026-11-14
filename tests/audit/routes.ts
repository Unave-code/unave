/**
 * Every customer route the launch audit screenshots, with the state it needs.
 * Slugs are real records in the dev database (2026-11-14). Tasks 3–8 reuse this
 * list for before/after shots, so add a route here rather than in a spec.
 */
export type AuditSetup = 'emptyCart' | 'filledCart' | 'signedIn' | 'formError'

export interface AuditRoute {
  id: string
  path: string
  setup?: AuditSetup
}

export const auditRoutes: AuditRoute[] = [
  { id: 'home', path: '/' },
  { id: 'products', path: '/products' },
  { id: 'cat-ready-to-cook', path: '/products/ready-to-cook' },
  { id: 'cat-ready-to-eat', path: '/products/ready-to-eat' },
  { id: 'cat-fresh-from-produce', path: '/products/fresh-from-produce' },
  { id: 'product-plan', path: '/products/lunch-plan' },
  { id: 'product-podi', path: '/products/sambar-podi' },
  { id: 'product-juices', path: '/products/juices' },
  { id: 'cart-empty', path: '/cart', setup: 'emptyCart' },
  { id: 'cart-filled', path: '/cart', setup: 'filledCart' },
  { id: 'checkout-signed-out', path: '/checkout', setup: 'filledCart' },
  { id: 'checkout-signed-in', path: '/checkout', setup: 'signedIn' },
  { id: 'account', path: '/account', setup: 'signedIn' },
  { id: 'sign-in', path: '/sign-in' },
  { id: 'sign-up', path: '/sign-up' },
  { id: 'forgot-password', path: '/forgot-password' },
  { id: 'about', path: '/about' },
  { id: 'our-kitchen', path: '/our-kitchen' },
  { id: 'contact', path: '/contact' },
  { id: 'contact-error', path: '/contact', setup: 'formError' },
  { id: 'blog', path: '/blog' },
  { id: 'search', path: '/search?q=podi' },
  { id: 'not-found', path: '/this-page-does-not-exist' },
]
