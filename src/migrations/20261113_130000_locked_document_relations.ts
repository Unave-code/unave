import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Register the combo collections in Payload's lock and preference relations.
 *
 * The collections and their tables were added in the meal combos migration,
 * but their relation columns were omitted from these Payload tables.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "checkout_intents_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "combo_audit_logs_id" integer;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_checkout_intents_id_idx"
      ON "payload_locked_documents_rels" USING btree ("checkout_intents_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_combo_audit_logs_id_idx"
      ON "payload_locked_documents_rels" USING btree ("combo_audit_logs_id");

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_checkout_intents_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_checkout_intents_fk"
          FOREIGN KEY ("checkout_intents_id") REFERENCES "public"."checkout_intents"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_combo_audit_logs_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_combo_audit_logs_fk"
          FOREIGN KEY ("combo_audit_logs_id") REFERENCES "public"."combo_audit_logs"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    ALTER TABLE "payload_preferences_rels" ADD COLUMN IF NOT EXISTS "checkout_intents_id" integer;
    ALTER TABLE "payload_preferences_rels" ADD COLUMN IF NOT EXISTS "combo_audit_logs_id" integer;
    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_checkout_intents_id_idx"
      ON "payload_preferences_rels" USING btree ("checkout_intents_id");
    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_combo_audit_logs_id_idx"
      ON "payload_preferences_rels" USING btree ("combo_audit_logs_id");

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payload_preferences_rels_checkout_intents_fk'
      ) THEN
        ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_checkout_intents_fk"
          FOREIGN KEY ("checkout_intents_id") REFERENCES "public"."checkout_intents"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payload_preferences_rels_combo_audit_logs_fk'
      ) THEN
        ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_combo_audit_logs_fk"
          FOREIGN KEY ("combo_audit_logs_id") REFERENCES "public"."combo_audit_logs"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_preferences_rels" DROP COLUMN IF EXISTS "checkout_intents_id";
    ALTER TABLE "payload_preferences_rels" DROP COLUMN IF EXISTS "combo_audit_logs_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "checkout_intents_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "combo_audit_logs_id";
  `)
}
