import 'dotenv/config'

import path from 'path'
import { getPayload } from 'payload'

import config from '../payload.config'
import type { MealPlan, Product } from '../payload-types'

/**
 * Dev seed: a handful of products (one-time, sized, a plan and a combo) and three
 * meal plans, with the audiences and subcategories they point at.
 *
 * Idempotent: every record is matched by slug and skipped when it already exists.
 * Refuses to run against a non-local database unless SEED_ALLOW_REMOTE=1.
 * Prices are in paise (₹1 = 100).
 */

const host = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? '').hostname
  } catch {
    return ''
  }
})()
const LOCAL = ['localhost', '127.0.0.1', '::1', 'postgres', 'db', 'host.docker.internal']
if (!LOCAL.includes(host) && process.env.SEED_ALLOW_REMOTE !== '1') {
  console.error(`Refusing to seed: DATABASE_URL host "${host}" is not local. Set SEED_ALLOW_REMOTE=1 to override.`)
  process.exit(1)
}

const rs = (rupees: number) => rupees * 100

const paragraph = (text: string): Product['description'] => ({
  root: {
    type: 'root',
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
    children: [
      {
        type: 'paragraph',
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        version: 1,
        children: [{ type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text, version: 1 }],
      },
    ],
  },
})

const payload = await getPayload({ config })
const ctx = { disableRevalidate: true }
/** `--meal-plans` seeds only the audiences and meal plans, leaving products alone. */
const mealPlansOnly = process.argv.includes('--meal-plans')
const counts = { created: 0, skipped: 0, failed: 0 }

const findBySlug = async (collection: 'audiences' | 'subcategories' | 'products' | 'meal-plans', slug: string) =>
  (await payload.find({ collection, depth: 0, limit: 1, overrideAccess: true, where: { slug: { equals: slug } } })).docs[0]

const mediaCache = new Map<string, number>()
const media = async (file: string, alt: string): Promise<number> => {
  const cached = mediaCache.get(alt)
  if (cached) return cached
  const existing = (await payload.find({ collection: 'media', depth: 0, limit: 1, overrideAccess: true, where: { alt: { equals: alt } } })).docs[0]
  const doc =
    existing ??
    (await payload.create({
      collection: 'media',
      data: { alt },
      filePath: path.resolve(process.cwd(), 'public', 'images', file),
      overrideAccess: true,
    }))
  mediaCache.set(alt, doc.id)
  return doc.id
}

/* Audiences */
const audienceIds: Record<string, number> = {}
for (const [i, title] of ['Adults', 'Kids', 'Special'].entries()) {
  const slug = title.toLowerCase()
  const doc =
    (await findBySlug('audiences', slug)) ??
    (await payload.create({ collection: 'audiences', data: { title, slug, position: i }, overrideAccess: true, context: ctx }))
  audienceIds[slug] = doc.id
}

/* Subcategories */
const subcategoryDefs = [
  { slug: 'breakfast', title: 'Breakfast', category: 'ready-to-eat', image: 'gallery-1.jpg', alt: 'A plated meal ready to eat' },
  { slug: 'lunch', title: 'Lunch', category: 'ready-to-eat', image: 'gallery-2.jpg', alt: 'A fresh meal with vegetables' },
  { slug: 'dinner', title: 'Dinner', category: 'ready-to-eat', image: 'gallery-3.jpg', alt: 'A prepared meal served on a plate' },
  { slug: 'tiffin', title: 'Tiffin', category: 'ready-to-cook', image: 'category-healthy.jpg', alt: 'Healthy food prepared for cooking' },
  { slug: 'vegetables', title: 'Vegetables', category: 'fresh-from-produce', image: 'category-nutrition.jpg', alt: 'Fresh produce and ingredients' },
] as const
const subIds: Record<string, number> = {}
for (const s of mealPlansOnly ? [] : subcategoryDefs) {
  const doc =
    (await findBySlug('subcategories', s.slug)) ??
    (await payload.create({
      collection: 'subcategories',
      data: { slug: s.slug, title: s.title, category: s.category, image: await media(s.image, s.alt) },
      overrideAccess: true,
      context: ctx,
    }))
  subIds[s.slug] = doc.id
}

/* Products */
type ProductSeed = Omit<Partial<Product>, 'components'> & {
  slug: string
  title: string
  img: [file: string, alt: string]
  sub: string
  aud: string
  componentSlugs?: string[]
}

const products: ProductSeed[] = [
  {
    slug: 'masala-oats-upma',
    title: 'Masala Oats Upma',
    type: 'one-time',
    category: 'ready-to-eat',
    sub: 'breakfast',
    aud: 'adults',
    price: rs(149),
    compareAtPrice: rs(179),
    featured: true,
    img: ['gallery-1.jpg', 'A plated meal ready to eat'],
    description: paragraph('Rolled oats tempered with mustard, curry leaves and vegetables. Light, filling and ready in the box.'),
    points: [{ point: 'High fibre' }, { point: 'No refined flour' }],
    benefits: [{ icon: 'wheat', title: 'Whole grain', description: 'Made with whole rolled oats.' }],
  },
  {
    slug: 'paneer-tikka-bowl',
    title: 'Paneer Tikka Bowl',
    type: 'one-time',
    category: 'ready-to-eat',
    sub: 'lunch',
    aud: 'adults',
    price: rs(249),
    featured: true,
    img: ['gallery-2.jpg', 'A fresh meal with vegetables'],
    description: paragraph('Tandoori paneer over brown rice with mint chutney and a crunchy kachumber salad.'),
    points: [{ point: '22 g protein' }, { point: 'Freshly cooked every morning' }],
    benefits: [{ icon: 'flame', title: 'Protein rich', description: 'Fresh paneer and a dal side.' }],
  },
  {
    slug: 'dal-khichdi-dinner',
    title: 'Dal Khichdi Dinner',
    type: 'one-time',
    category: 'ready-to-eat',
    sub: 'dinner',
    aud: 'adults',
    price: rs(199),
    featured: true,
    img: ['gallery-3.jpg', 'A prepared meal served on a plate'],
    description: paragraph('Moong dal and rice khichdi with ghee tadka, papad and a seasonal subzi.'),
    benefits: [{ icon: 'heart', title: 'Easy on the stomach' }],
  },
  {
    slug: 'kids-mini-paratha-box',
    title: 'Kids Mini Paratha Box',
    type: 'one-time',
    category: 'ready-to-eat',
    sub: 'lunch',
    aud: 'kids',
    price: rs(129),
    img: ['category-diet.jpg', 'A small lunch box meal for children'],
    description: paragraph('Three mini vegetable parathas with curd dip and fruit, sized for a school tiffin.'),
  },
  {
    slug: 'ready-to-cook-millet-dosa-batter',
    title: 'Millet Dosa Batter',
    type: 'one-time',
    category: 'ready-to-cook',
    sub: 'tiffin',
    aud: 'adults',
    sizes: [
      { label: '500 g', price: rs(89) },
      { label: '1 kg', price: rs(159), compareAtPrice: rs(178) },
    ],
    featured: true,
    img: ['category-healthy.jpg', 'Healthy food prepared for cooking'],
    description: paragraph('Fermented foxtail millet and urad dal batter. Keeps four days in the fridge.'),
  },
  {
    slug: 'seasonal-vegetable-basket',
    title: 'Seasonal Vegetable Basket',
    type: 'one-time',
    category: 'fresh-from-produce',
    sub: 'vegetables',
    aud: 'adults',
    price: rs(299),
    packSize: 'About 3 kg',
    img: ['category-nutrition.jpg', 'Fresh produce and ingredients'],
    description: paragraph("This week's farm vegetables, washed and packed."),
  },
  {
    slug: 'diabetic-friendly-lunch-plan',
    title: 'Diabetic-Friendly Lunch Plan',
    type: 'plan',
    category: 'ready-to-eat',
    sub: 'lunch',
    aud: 'special',
    durations: [
      { label: '1 week', days: 6, price: rs(1494) },
      { label: '2 weeks', days: 12, price: rs(2839) },
      { label: '1 month', days: 24, price: rs(5379) },
    ],
    howItWorks: 'One low-GI lunch delivered Monday to Saturday. Pause any day before 9 PM the evening before.',
    img: ['category-diabetes.jpg', 'A balanced low glycemic meal'],
    description: paragraph('Portion-controlled, low-GI lunches planned with a nutritionist.'),
  },
  {
    slug: 'breakfast-and-lunch-combo',
    title: 'Breakfast and Lunch Combo',
    type: 'combo',
    category: 'ready-to-eat',
    sub: 'lunch',
    aud: 'adults',
    price: rs(359),
    componentSlugs: ['masala-oats-upma', 'paneer-tikka-bowl'],
    img: ['hero-table.jpg', 'A table set with several dishes'],
    description: paragraph('Masala oats upma for breakfast and a paneer tikka bowl for lunch, delivered together.'),
  },
]

for (const { slug, img, sub, aud, componentSlugs, ...rest } of mealPlansOnly ? [] : products) {
  if (await findBySlug('products', slug)) {
    counts.skipped++
    continue
  }
  try {
    const components = componentSlugs
      ? await Promise.all(
          componentSlugs.map(async (s) => {
            const p = await findBySlug('products', s)
            if (!p) throw new Error(`combo item ${s} is missing`)
            return { product: p.id }
          }),
        )
      : undefined
    await payload.create({
      collection: 'products',
      data: {
        ...rest,
        slug,
        image: await media(...img),
        subcategory: subIds[sub],
        audience: audienceIds[aud],
        available: true,
        ...(components ? { components } : {}),
      } as Product,
      overrideAccess: true,
      context: ctx,
    })
    counts.created++
  } catch (error) {
    counts.failed++
    payload.logger.error(`Product ${slug}: ${(error as Error).message}`)
  }
}

/* Meal plans */
const week = (
  days: [lunchMain: string, lunchSides: string, dinnerMain: string, dinnerSides: string][],
): MealPlan['thisWeek'] => {
  const keys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
  return {
    range: '23 – 28 Nov',
    ...Object.fromEntries(
      keys.map((k, i) => {
        const [lunchMain, lunchSides, dinnerMain, dinnerSides] = days[i]
        return [k, { lunchMain, lunchSides, dinnerMain, dinnerSides }]
      }),
    ),
  }
}

const everydayMenu = week([
  ['Kadhai Paneer with carrot roti', 'Sprouted moong salad, Matki dal', 'Soya Masala with multigrain roti', 'Mixed bean salad, Aloo gobi'],
  ['Rajma with brown rice', 'Cucumber raita, Bhindi fry', 'Palak Dal with jowar roti', 'Beetroot salad, Lauki chana'],
  ['Chole with bajra roti', 'Kachumber, Jeera aloo', 'Vegetable Pulao', 'Boondi raita, Masoor dal'],
  ['Methi Thepla with curd', 'Tindora subzi, Toor dal', 'Mushroom Mutter with roti', 'Carrot salad, Moong dal'],
  ['Sambar Rice', 'Cabbage poriyal, Papad', 'Paneer Bhurji with roti', 'Corn salad, Dal tadka'],
  ['Veg Biryani', 'Mint raita, Mirchi salan', 'Dal Khichdi', 'Kadhi, Roasted papad'],
])

const kidsMenu = week([
  ['Mini veg parathas', 'Curd dip, Apple slices', '', ''],
  ['Paneer frankie', 'Carrot sticks, Banana', '', ''],
  ['Lemon rice', 'Potato fry, Grapes', '', ''],
  ['Veg pasta in tomato sauce', 'Corn, Orange', '', ''],
  ['Idli with sambar', 'Coconut chutney, Papaya', '', ''],
  ['Cheese corn sandwich', 'Cucumber, Pomegranate', '', ''],
])

const plans: (Partial<MealPlan> & { slug: string; title: string; img: [string, string]; aud: string })[] = [
  {
    slug: 'everyday-indian',
    title: 'Everyday Indian',
    position: 0,
    aud: 'adults',
    meals: 'any',
    img: ['kitchen.jpg', 'Meals being prepared in the kitchen'],
    description: 'Home-style North and South Indian meals, cooked fresh each day with less oil and no maida.',
    prices: [
      { length: '1 week', days: 6, lunchPrice: rs(1194), dinnerPrice: rs(1194), bothPrice: rs(2268) },
      { length: '2 weeks', days: 12, note: 'Save 5%', lunchPrice: rs(2268), dinnerPrice: rs(2268), bothPrice: rs(4309) },
      { length: '1 month', days: 24, note: 'Save 10%', lunchPrice: rs(4298), dinnerPrice: rs(4298), bothPrice: rs(8165) },
    ],
    optionGroups: [
      {
        title: 'Roti or rice',
        hint: 'Pick your staple with every meal.',
        choices: [
          { label: 'Roti', detail: 'Three multigrain rotis', extraPerDay: 0 },
          { label: 'Rice', detail: 'One bowl of brown rice', extraPerDay: 0 },
        ],
      },
      {
        title: 'Juice',
        hint: 'One 250 ml bottle a day, with your first meal.',
        choices: [
          { label: 'No juice', extraPerDay: 0 },
          { label: 'Normal juice', detail: 'Seasonal fruit', extraPerDay: rs(40) },
          { label: 'Detox juice', detail: 'Amla, beet and ginger', extraPerDay: rs(60) },
        ],
      },
    ],
    thisWeek: everydayMenu,
  },
  {
    slug: 'kids-lunch-box',
    title: 'Kids Lunch Box',
    position: 1,
    aud: 'kids',
    meals: 'lunch',
    img: ['category-diet.jpg', 'A small lunch box meal for children'],
    description: 'A school-sized lunch with a fruit portion, mild on spice and delivered before the break.',
    lunchTime: '10:30 – 11:30 AM',
    prices: [
      { length: '1 week', days: 6, lunchPrice: rs(774) },
      { length: '1 month', days: 24, note: 'Save 8%', lunchPrice: rs(2849) },
    ],
    optionGroups: [
      {
        title: 'Portion',
        choices: [
          { label: 'Junior', detail: 'Ages 4 – 8', extraPerDay: 0 },
          { label: 'Senior', detail: 'Ages 9 – 14', extraPerDay: rs(20) },
        ],
      },
    ],
    thisWeek: kidsMenu,
  },
  {
    slug: 'low-gi-dinner',
    title: 'Low-GI Dinner',
    position: 2,
    aud: 'special',
    meals: 'dinner',
    img: ['category-diabetes.jpg', 'A balanced low glycemic meal'],
    description: 'Light, low-glycaemic dinners planned with a nutritionist, for steadier evening sugar levels.',
    prices: [
      { length: '2 weeks', days: 12, dinnerPrice: rs(2988) },
      { length: '1 month', days: 24, note: 'Save 7%', dinnerPrice: rs(5559) },
    ],
    thisWeek: everydayMenu,
  },
]

for (const { slug, img, aud, ...rest } of plans) {
  if (await findBySlug('meal-plans', slug)) {
    counts.skipped++
    continue
  }
  try {
    await payload.create({
      collection: 'meal-plans',
      data: { ...rest, slug, image: await media(...img), audience: audienceIds[aud] } as MealPlan,
      overrideAccess: true,
      context: ctx,
    })
    counts.created++
  } catch (error) {
    counts.failed++
    payload.logger.error(`Meal plan ${slug}: ${(error as Error).message}`)
  }
}

payload.logger.info(`Seeded catalogue on ${host}: ${counts.created} created, ${counts.skipped} skipped, ${counts.failed} failed.`)
process.exit(counts.failed > 0 ? 1 : 0)
