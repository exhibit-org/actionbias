-- Fix for git context migration that might not have run
-- This handles the case where the columns might or might not exist

-- Add git_context column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'completion_contexts' 
                   AND column_name = 'git_context') THEN
        ALTER TABLE "completion_contexts" ADD COLUMN "git_context" jsonb;
    END IF;
END $$;

-- Drop old columns if they exist
DO $$ 
BEGIN
    -- Drop git_commit_hash if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'completion_contexts' 
               AND column_name = 'git_commit_hash') THEN
        ALTER TABLE "completion_contexts" DROP COLUMN "git_commit_hash";
    END IF;
    
    -- Drop git_commit_message if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'completion_contexts' 
               AND column_name = 'git_commit_message') THEN
        ALTER TABLE "completion_contexts" DROP COLUMN "git_commit_message";
    END IF;
    
    -- Drop git_branch if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'completion_contexts' 
               AND column_name = 'git_branch') THEN
        ALTER TABLE "completion_contexts" DROP COLUMN "git_branch";
    END IF;
    
    -- Drop git_commit_author if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'completion_contexts' 
               AND column_name = 'git_commit_author') THEN
        ALTER TABLE "completion_contexts" DROP COLUMN "git_commit_author";
    END IF;
    
    -- Drop git_commit_author_username if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'completion_contexts' 
               AND column_name = 'git_commit_author_username') THEN
        ALTER TABLE "completion_contexts" DROP COLUMN "git_commit_author_username";
    END IF;
    
    -- Drop git_commit_timestamp if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'completion_contexts' 
               AND column_name = 'git_commit_timestamp') THEN
        ALTER TABLE "completion_contexts" DROP COLUMN "git_commit_timestamp";
    END IF;
    
    -- Drop git_diff_stats if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'completion_contexts' 
               AND column_name = 'git_diff_stats') THEN
        ALTER TABLE "completion_contexts" DROP COLUMN "git_diff_stats";
    END IF;
    
    -- Drop git_related_commits if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'completion_contexts' 
               AND column_name = 'git_related_commits') THEN
        ALTER TABLE "completion_contexts" DROP COLUMN "git_related_commits";
    END IF;
END $$;