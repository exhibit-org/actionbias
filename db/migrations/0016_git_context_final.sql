-- Final migration for git_context refactor
-- This uses ALTER TABLE IF EXISTS syntax which is safer

-- Add git_context column (will fail silently if already exists)
ALTER TABLE "completion_contexts" ADD COLUMN IF NOT EXISTS "git_context" jsonb;

-- Drop old columns (will fail silently if they don't exist)
ALTER TABLE "completion_contexts" DROP COLUMN IF EXISTS "git_commit_hash";
ALTER TABLE "completion_contexts" DROP COLUMN IF EXISTS "git_commit_message";
ALTER TABLE "completion_contexts" DROP COLUMN IF EXISTS "git_branch";
ALTER TABLE "completion_contexts" DROP COLUMN IF EXISTS "git_commit_author";
ALTER TABLE "completion_contexts" DROP COLUMN IF EXISTS "git_commit_author_username";
ALTER TABLE "completion_contexts" DROP COLUMN IF EXISTS "git_commit_timestamp";
ALTER TABLE "completion_contexts" DROP COLUMN IF EXISTS "git_diff_stats";
ALTER TABLE "completion_contexts" DROP COLUMN IF EXISTS "git_related_commits";