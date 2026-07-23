ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "token_version" integer NOT NULL DEFAULT 0;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_token_version_idx" ON "user" USING btree ("token_version");
