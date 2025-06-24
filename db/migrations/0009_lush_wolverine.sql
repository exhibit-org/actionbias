CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"source" text DEFAULT 'homepage' NOT NULL,
	"metadata" jsonb,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_waitlist_email" ON "waitlist" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_waitlist_created_at" ON "waitlist" USING btree ("created_at" DESC);