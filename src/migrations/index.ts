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
import * as migration_20261113_130000_locked_document_relations from './20261113_130000_locked_document_relations';
import * as migration_20261114_102751_home_gallery_links from './20261114_102751_home_gallery_links';
import * as migration_20261114_140000_testimonials_global from './20261114_140000_testimonials_global';
import * as migration_20261116_120000_product_gallery from './20261116_120000_product_gallery';
import * as migration_20261116_160000_product_sizes_plan_text from './20261116_160000_product_sizes_plan_text';
import * as migration_20261116_180000_plan_lead_total from './20261116_180000_plan_lead_total';
import * as migration_20261117_120000_product_benefits from './20261117_120000_product_benefits';
import * as migration_20261119_120000_audiences_collection from './20261119_120000_audiences_collection';
import * as migration_20261119_150000_product_kind_ticks from './20261119_150000_product_kind_ticks';
import * as migration_20261120_170000_plan_builder_global from './20261120_170000_plan_builder_global';
import * as migration_20261120_190000_meal_plans from './20261120_190000_meal_plans';
import * as migration_20261121_120000_meal_plan_settings_per_plan from './20261121_120000_meal_plan_settings_per_plan';
import * as migration_20261121_150000_drop_next_week_menu from './20261121_150000_drop_next_week_menu';
import * as migration_20261121_180000_meal_plan_subcategory from './20261121_180000_meal_plan_subcategory';
import * as migration_20261121_200000_category_pages_global from './20261121_200000_category_pages_global';
import * as migration_20261121_220000_meal_plan_trial_length from './20261121_220000_meal_plan_trial_length'
import * as migration_20261121_240000_order_payment_details from './20261121_240000_order_payment_details';
import * as migration_20261124_120000_email_design from './20261124_120000_email_design'
import * as migration_20261125_120000_product_addons from './20261125_120000_product_addons';

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
  {
    up: migration_20261113_130000_locked_document_relations.up,
    down: migration_20261113_130000_locked_document_relations.down,
    name: '20261113_130000_locked_document_relations',
  },
  {
    up: migration_20261114_102751_home_gallery_links.up,
    down: migration_20261114_102751_home_gallery_links.down,
    name: '20261114_102751_home_gallery_links',
  },
  {
    up: migration_20261114_140000_testimonials_global.up,
    down: migration_20261114_140000_testimonials_global.down,
    name: '20261114_140000_testimonials_global',
  },
  {
    up: migration_20261116_120000_product_gallery.up,
    down: migration_20261116_120000_product_gallery.down,
    name: '20261116_120000_product_gallery',
  },
  {
    up: migration_20261116_160000_product_sizes_plan_text.up,
    down: migration_20261116_160000_product_sizes_plan_text.down,
    name: '20261116_160000_product_sizes_plan_text',
  },
  {
    up: migration_20261116_180000_plan_lead_total.up,
    down: migration_20261116_180000_plan_lead_total.down,
    name: '20261116_180000_plan_lead_total',
  },
  {
    up: migration_20261117_120000_product_benefits.up,
    down: migration_20261117_120000_product_benefits.down,
    name: '20261117_120000_product_benefits',
  },
  {
    up: migration_20261119_120000_audiences_collection.up,
    down: migration_20261119_120000_audiences_collection.down,
    name: '20261119_120000_audiences_collection',
  },
  {
    up: migration_20261119_150000_product_kind_ticks.up,
    down: migration_20261119_150000_product_kind_ticks.down,
    name: '20261119_150000_product_kind_ticks',
  },
  {
    up: migration_20261120_170000_plan_builder_global.up,
    down: migration_20261120_170000_plan_builder_global.down,
    name: '20261120_170000_plan_builder_global',
  },
  {
    up: migration_20261120_190000_meal_plans.up,
    down: migration_20261120_190000_meal_plans.down,
    name: '20261120_190000_meal_plans',
  },
  {
    up: migration_20261121_120000_meal_plan_settings_per_plan.up,
    down: migration_20261121_120000_meal_plan_settings_per_plan.down,
    name: '20261121_120000_meal_plan_settings_per_plan',
  },
  {
    up: migration_20261121_150000_drop_next_week_menu.up,
    down: migration_20261121_150000_drop_next_week_menu.down,
    name: '20261121_150000_drop_next_week_menu',
  },
  {
    up: migration_20261121_180000_meal_plan_subcategory.up,
    down: migration_20261121_180000_meal_plan_subcategory.down,
    name: '20261121_180000_meal_plan_subcategory',
  },
  {
    up: migration_20261121_200000_category_pages_global.up,
    down: migration_20261121_200000_category_pages_global.down,
    name: '20261121_200000_category_pages_global',
  },
  {
    up: migration_20261121_220000_meal_plan_trial_length.up,
    down: migration_20261121_220000_meal_plan_trial_length.down,
    name: '20261121_220000_meal_plan_trial_length',
  },
  {
    up: migration_20261121_240000_order_payment_details.up,
    down: migration_20261121_240000_order_payment_details.down,
    name: '20261121_240000_order_payment_details',
  },
  {
    up: migration_20261124_120000_email_design.up,
    down: migration_20261124_120000_email_design.down,
    name: '20261124_120000_email_design',
  },
  {
    up: migration_20261125_120000_product_addons.up,
    down: migration_20261125_120000_product_addons.down,
    name: '20261125_120000_product_addons',
  },
];
