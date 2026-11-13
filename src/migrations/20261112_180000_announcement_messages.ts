import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "header_announcement_messages" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "text" varchar NOT NULL,
      "note" varchar,
      "link_label" varchar,
      "link_url" varchar,
      "new_tab" boolean DEFAULT false
    );

    CREATE INDEX IF NOT EXISTS "header_announcement_messages_order_idx"
      ON "header_announcement_messages" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "header_announcement_messages_parent_id_idx"
      ON "header_announcement_messages" USING btree ("_parent_id");

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'header_announcement_messages_parent_id_fk'
      ) THEN
        ALTER TABLE "header_announcement_messages"
          ADD CONSTRAINT "header_announcement_messages_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."header"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    INSERT INTO "header_announcement_messages" (
      "_order", "_parent_id", "id", "text", "note", "link_label", "link_url", "new_tab"
    )
    SELECT
      1, "id", 'legacy-announcement-' || "id"::text,
      COALESCE("announcement_text", ''), "announcement_note", "announcement_link_label",
      "announcement_link_url", "announcement_new_tab"
    FROM "header"
    WHERE ("announcement_text" IS NOT NULL OR "announcement_note" IS NOT NULL)
      AND NOT EXISTS (
        SELECT 1 FROM "header_announcement_messages" AS "messages"
        WHERE "messages"."_parent_id" = "header"."id"
      );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "header_announcement_messages";
  `)
}
