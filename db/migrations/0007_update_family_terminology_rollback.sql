-- Rollback: Rename family columns back to parent terminology
-- NOTE: Only run this if you need to rollback the 0007_update_family_terminology migration
ALTER TABLE "actions" RENAME COLUMN "family_context_summary" TO "parent_context_summary";
ALTER TABLE "actions" RENAME COLUMN "family_vision_summary" TO "parent_vision_summary";