CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"source" text DEFAULT 'homepage' NOT NULL,
	"metadata" jsonb,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "completion_contexts" ADD COLUMN "headline" text;--> statement-breakpoint
ALTER TABLE "completion_contexts" ADD COLUMN "deck" text;--> statement-breakpoint
ALTER TABLE "completion_contexts" ADD COLUMN "pull_quotes" jsonb;