-- Rename parent columns to family terminology
-- NOTE: After running this migration, update schema.ts to use 'family_context_summary' and 'family_vision_summary'
ALTER TABLE "actions" RENAME COLUMN "parent_context_summary" TO "family_context_summary";
ALTER TABLE "actions" RENAME COLUMN "parent_vision_summary" TO "family_vision_summary";