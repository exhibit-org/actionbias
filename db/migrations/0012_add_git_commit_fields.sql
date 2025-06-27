-- Add git commit tracking fields to completion_contexts
ALTER TABLE "completion_contexts" ADD COLUMN "git_commit_hash" text;
ALTER TABLE "completion_contexts" ADD COLUMN "git_commit_message" text;
ALTER TABLE "completion_contexts" ADD COLUMN "git_branch" text;
ALTER TABLE "completion_contexts" ADD COLUMN "git_commit_author" text;
ALTER TABLE "completion_contexts" ADD COLUMN "git_commit_timestamp" timestamp;
ALTER TABLE "completion_contexts" ADD COLUMN "git_diff_stats" jsonb;
ALTER TABLE "completion_contexts" ADD COLUMN "git_related_commits" jsonb;