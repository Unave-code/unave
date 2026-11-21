import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/** What Razorpay sent about each payment, kept on the order. Guarded for a database shaped by dev push. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_method" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_vpa" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_card_network" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_card_type" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_card_last4" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_bank" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_wallet" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_bank_reference" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_fee" numeric;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_tax" numeric;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_email" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_contact" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_captured_at" timestamp(3) with time zone;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_method";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_vpa";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_card_network";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_card_type";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_card_last4";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_bank";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_wallet";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_bank_reference";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_fee";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_tax";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_email";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_contact";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_captured_at";
  `)
}
