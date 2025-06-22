CREATE TABLE "completion_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_id" uuid NOT NULL,
	"implementation_story" text,
	"impact_story" text,
	"learning_story" text,
	"completion_timestamp" timestamp DEFAULT now() NOT NULL,
	"changelog_visibility" text DEFAULT 'team' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"structured_data" jsonb
);
--> statement-breakpoint
ALTER TABLE "completion_contexts" ADD CONSTRAINT "completion_contexts_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;