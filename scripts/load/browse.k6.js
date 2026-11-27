/**
 * Browse load test (k6, https://k6.io).
 *
 * Simulates the traffic the site actually gets: mostly browsing, a little cart
 * use, never a payment. Run it against a staging deploy or a quiet-hour
 * production run announced in advance, never through Cloudflare, so it measures
 * the origin server itself. docs/deploy.md ("Load testing") has the full how-to.
 *
 *   k6 run -e BASE_URL=https://staging.unave.in scripts/load/browse.k6.js
 *   k6 run -e BASE_URL=... -e PROFILE=load scripts/load/browse.k6.js
 *
 * PROFILE: smoke (default, 2 visitors for 30 s), load (ramps 10 → 25 → 50) or
 * stress (ramps on to 100, to find where it breaks).
 */
import http from 'k6/http'
import { check, fail, sleep } from 'k6'

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const PROFILE = __ENV.PROFILE || 'smoke'

const PROFILES = {
  smoke: [{ duration: '30s', target: 2 }],
  load: [
    { duration: '1m', target: 10 },
    { duration: '3m', target: 10 },
    { duration: '1m', target: 25 },
    { duration: '3m', target: 25 },
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  stress: [
    { duration: '2m', target: 25 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 75 },
    { duration: '2m', target: 100 },
    { duration: '3m', target: 100 },
    { duration: '1m', target: 0 },
  ],
}

if (!PROFILES[PROFILE]) fail(`Unknown PROFILE "${PROFILE}". Use smoke, load or stress.`)

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      gracefulRampDown: '30s',
      stages: PROFILES[PROFILE],
      startVUs: 0,
    },
  },
  // The pass line from docs/deploy.md: 95% of requests under 800 ms, under 1% failing.
  thresholds: {
    checks: ['rate>0.99'],
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:home}': ['p(95)<800'],
    'http_req_duration{name:product}': ['p(95)<800'],
    'http_req_duration{name:products}': ['p(95)<800'],
  },
}

/** Real slugs, read once from the public REST API before any visitor starts. */
export function setup() {
  const products = http.get(`${BASE_URL}/api/products?depth=0&limit=100`, { tags: { name: 'setup' } })
  if (products.status !== 200) fail(`GET /api/products answered ${products.status}; is BASE_URL right?`)

  const docs = products.json('docs') || []
  const sellable = docs.filter((product) => product.slug && product.available !== false)

  // A subscription product with a duration can go into the cart in one plain post.
  const cartable = sellable
    .filter((product) => product.type !== 'one-time' && product.type !== 'combo')
    .filter((product) => Array.isArray(product.durations) && product.durations.length > 0)
    .map((product) => ({ duration: product.durations[0].label, slug: product.slug }))

  const plans = http.get(`${BASE_URL}/api/meal-plans?depth=0&limit=50`, { tags: { name: 'setup' } })
  const planSlugs =
    plans.status === 200 ? (plans.json('docs') || []).map((plan) => plan.slug).filter(Boolean) : []

  if (sellable.length === 0) fail('No products came back from /api/products; seed the catalogue first.')

  return { cartable, planSlugs, productSlugs: sellable.map((product) => product.slug) }
}

const pick = (list) => list[Math.floor(Math.random() * list.length)]

/** A visitor reads a page for a moment before the next click. */
const think = () => sleep(1 + Math.random() * 2)

const page = (path, name) => {
  const response = http.get(`${BASE_URL}${path}`, { tags: { name } })
  check(response, { [`${name} is 200`]: (r) => r.status === 200 })
  return response
}

/** The cart routes are plain form posts that answer 303; only a same-origin post is accepted. */
const post = (path, name, body) =>
  http.post(`${BASE_URL}${path}`, body, {
    headers: { Origin: BASE_URL },
    redirects: 0,
    tags: { name },
  })

const browseHome = () => {
  page('/', 'home')
  think()
  page('/products', 'products')
}

const browseProduct = (data) => {
  page(`/products/${pick(data.productSlugs)}`, 'product')
  think()
  if (data.planSlugs.length > 0 && Math.random() < 0.5) {
    page(`/meal-subscription/${pick(data.planSlugs)}`, 'meal-plan')
  } else {
    page('/meal-subscription', 'meal-subscription')
  }
}

const shopInCart = (data) => {
  if (data.cartable.length === 0) return browseHome()

  const line = pick(data.cartable)
  const added = post('/api/cart/add', 'cart-add', {
    duration: line.duration,
    product: line.slug,
    return: '/cart',
  })
  check(added, {
    'cart-add redirects': (r) => r.status === 303,
    'cart-add accepted': (r) => !String(r.headers.Location || '').includes('notice=unknown'),
  })
  think()
  page('/cart', 'cart')
  think()
  const removed = post('/api/cart/remove', 'cart-remove', {
    line: JSON.stringify([line.slug, line.duration]),
    return: '/cart',
  })
  check(removed, { 'cart-remove redirects': (r) => r.status === 303 })
}

export default function visitor(data) {
  const roll = Math.random()

  if (roll < 0.7) browseHome()
  else if (roll < 0.9) browseProduct(data)
  else shopInCart(data)

  think()
}
