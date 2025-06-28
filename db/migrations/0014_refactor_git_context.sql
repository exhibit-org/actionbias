-- Add new git_context jsonb column
ALTER TABLE "completion_contexts" ADD COLUMN "git_context" jsonb;

-- Drop old git-related columns
ALTER TABLE "completion_contexts" DROP COLUMN "git_commit_hash";
ALTER TABLE "completion_contexts" DROP COLUMN "git_commit_message";
ALTER TABLE "completion_contexts" DROP COLUMN "git_branch";
ALTER TABLE "completion_contexts" DROP COLUMN "git_commit_author";
ALTER TABLE "completion_contexts" DROP COLUMN "git_commit_author_username";
ALTER TABLE "completion_contexts" DROP COLUMN "git_commit_timestamp";
ALTER TABLE "completion_contexts" DROP COLUMN "git_diff_stats";
ALTER TABLE "completion_contexts" DROP COLUMN "git_related_commits";