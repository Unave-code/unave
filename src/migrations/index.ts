import * as migration_20261029_120431_baseline from './20261029_120431_baseline';
import * as migration_20261029_120501_guest_plan_page from './20261029_120501_guest_plan_page';
import * as migration_20261030_160000_customer_accounts from './20261030_160000_customer_accounts';
import * as migration_20261030_170000_remove_guest_plan_links from './20261030_170000_remove_guest_plan_links';
import * as migration_20261031_090000_payload_customer_auth from './20261031_090000_payload_customer_auth';
import * as migration_20261031_120000_customer_has_password from './20261031_120000_customer_has_password';
import * as migration_20261031_130000_customer_profile from './20261031_130000_customer_profile';
import * as migration_20261031_150000_enquiries from './20261031_150000_enquiries';
import * as migration_20261031_180000_remove_plans_subscriptions from './20261031_180000_remove_plans_subscriptions';
import * as migration_20261101_120000_create_plans_and_orders from './20261101_120000_create_plans_and_orders';
import * as migration_20261101_125000_chrome_schema_backfill from './20261101_125000_chrome_schema_backfill';
import * as migration_20261101_130000_plans_chrome from './20261101_130000_plans_chrome';
import * as migration_20261101_140000_plan_points from './20261101_140000_plan_points';
import * as migration_20261101_150000_paid_orders_only from './20261101_150000_paid_orders_only';
import * as migration_20261102_200000_order_requests from './20261102_200000_order_requests';
import * as migration_20261105_170000_plan_category_audience from './20261105_170000_plan_category_audience';
import * as migration_20261106_120000_plan_subcategories from './20261106_120000_plan_subcategories';
import * as migration_20261107_100000_rename_plans_to_products from './20261107_100000_rename_plans_to_products';
import * as migration_20261109_100000_hero_global from './20261109_100000_hero_global';
import * as migration_20261110_120000_product_featured from './20261110_120000_product_featured';
import * as migration_20261110_130000_hero_slide_overlay from './20261110_130000_hero_slide_overlay';
import * as migration_20261111_090000_one_time_products from './20261111_090000_one_time_products';
import * as migration_20261111_160000_product_lead_price from './20261111_160000_product_lead_price';
import * as migration_20261111_170000_normalize_product_slugs from './20261111_170000_normalize_product_slugs';
import * as migration_20261112_100000_home_hero_image_slides from './20261112_100000_home_hero_image_slides';
import * as migration_20261112_130000_subcategory_image from './20261112_130000_subcategory_image';
import * as migration_20261112_140000_subcategory_slug_nullable from './20261112_140000_subcategory_slug_nullable';
import * as migration_20261112_150000_best_seller_product_fields from './20261112_150000_best_seller_product_fields';
import * as migration_20261112_160000_subcategory_slug_backfill from './20261112_160000_subcategory_slug_backfill';
import * as migration_20261112_170000_meal_combos from './20261112_170000_meal_combos';
import * as migration_20261112_180000_announcement_messages from './20261112_180000_announcement_messages';

export const migrations = [
  {
    up: migration_20261029_120431_baseline.up,
    down: migration_20261029_120431_baseline.down,
    name: '20261029_120431_baseline',
  },
  {
    up: migration_20261029_120501_guest_plan_page.up,
    down: migration_20261029_120501_guest_plan_page.down,
    name: '20261029_120501_guest_plan_page'
  },
  {
    up: migration_20261030_160000_customer_accounts.up,
    down: migration_20261030_160000_customer_accounts.down,
    name: '20261030_160000_customer_accounts',
  },
  {
    up: migration_20261030_170000_remove_guest_plan_links.up,
    down: migration_20261030_170000_remove_guest_plan_links.down,
    name: '20261030_170000_remove_guest_plan_links',
  },
  {
    up: migration_20261031_090000_payload_customer_auth.up,
    down: migration_20261031_090000_payload_customer_auth.down,
    name: '20261031_090000_payload_customer_auth',
  },
  {
    up: migration_20261031_120000_customer_has_password.up,
    down: migration_20261031_120000_customer_has_password.down,
    name: '20261031_120000_customer_has_password',
  },
  {
    up: migration_20261031_130000_customer_profile.up,
    down: migration_20261031_130000_customer_profile.down,
    name: '20261031_130000_customer_profile',
  },
  {
    up: migration_20261031_150000_enquiries.up,
    down: migration_20261031_150000_enquiries.down,
    name: '20261031_150000_enquiries',
  },
  {
    up: migration_20261031_180000_remove_plans_subscriptions.up,
    down: migration_20261031_180000_remove_plans_subscriptions.down,
    name: '20261031_180000_remove_plans_subscriptions',
  },
  {
    up: migration_20261101_120000_create_plans_and_orders.up,
    down: migration_20261101_120000_create_plans_and_orders.down,
    name: '20261101_120000_create_plans_and_orders',
  },
  {
    up: migration_20261101_125000_chrome_schema_backfill.up,
    down: migration_20261101_125000_chrome_schema_backfill.down,
    name: '20261101_125000_chrome_schema_backfill',
  },
  {
    up: migration_20261101_130000_plans_chrome.up,
    down: migration_20261101_130000_plans_chrome.down,
    name: '20261101_130000_plans_chrome',
  },
  {
    up: migration_20261101_140000_plan_points.up,
    down: migration_20261101_140000_plan_points.down,
    name: '20261101_140000_plan_points',
  },
  {
    up: migration_20261101_150000_paid_orders_only.up,
    down: migration_20261101_150000_paid_orders_only.down,
    name: '20261101_150000_paid_orders_only',
  },
  {
    up: migration_20261102_200000_order_requests.up,
    down: migration_20261102_200000_order_requests.down,
    name: '20261102_200000_order_requests',
  },
  {
    up: migration_20261105_170000_plan_category_audience.up,
    down: migration_20261105_170000_plan_category_audience.down,
    name: '20261105_170000_plan_category_audience',
  },
  {
    up: migration_20261106_120000_plan_subcategories.up,
    down: migration_20261106_120000_plan_subcategories.down,
    name: '20261106_120000_plan_subcategories',
  },
  {
    up: migration_20261107_100000_rename_plans_to_products.up,
    down: migration_20261107_100000_rename_plans_to_products.down,
    name: '20261107_100000_rename_plans_to_products',
  },
  {
    up: migration_20261109_100000_hero_global.up,
    down: migration_20261109_100000_hero_global.down,
    name: '20261109_100000_hero_global',
  },
  {
    up: migration_20261110_120000_product_featured.up,
    down: migration_20261110_120000_product_featured.down,
    name: '20261110_120000_product_featured',
  },
  {
    up: migration_20261110_130000_hero_slide_overlay.up,
    down: migration_20261110_130000_hero_slide_overlay.down,
    name: '20261110_130000_hero_slide_overlay',
  },
  {
    up: migration_20261111_090000_one_time_products.up,
    down: migration_20261111_090000_one_time_products.down,
    name: '20261111_090000_one_time_products',
  },
  {
    up: migration_20261111_160000_product_lead_price.up,
    down: migration_20261111_160000_product_lead_price.down,
    name: '20261111_160000_product_lead_price',
  },
  {
    up: migration_20261111_170000_normalize_product_slugs.up,
    down: migration_20261111_170000_normalize_product_slugs.down,
    name: '20261111_170000_normalize_product_slugs',
  },
  {
    up: migration_20261112_100000_home_hero_image_slides.up,
    down: migration_20261112_100000_home_hero_image_slides.down,
    name: '20261112_100000_home_hero_image_slides',
  },
  {
    up: migration_20261112_130000_subcategory_image.up,
    down: migration_20261112_130000_subcategory_image.down,
    name: '20261112_130000_subcategory_image',
  },
  {
    up: migration_20261112_140000_subcategory_slug_nullable.up,
    down: migration_20261112_140000_subcategory_slug_nullable.down,
    name: '20261112_140000_subcategory_slug_nullable',
  },
  {
    up: migration_20261112_150000_best_seller_product_fields.up,
    down: migration_20261112_150000_best_seller_product_fields.down,
    name: '20261112_150000_best_seller_product_fields',
  },
  {
    up: migration_20261112_160000_subcategory_slug_backfill.up,
    down: migration_20261112_160000_subcategory_slug_backfill.down,
    name: '20261112_160000_subcategory_slug_backfill',
  },
  {
    up: migration_20261112_170000_meal_combos.up,
    down: migration_20261112_170000_meal_combos.down,
    name: '20261112_170000_meal_combos',
  },
  {
    up: migration_20261112_180000_announcement_messages.up,
    down: migration_20261112_180000_announcement_messages.down,
    name: '20261112_180000_announcement_messages',
  },
];
