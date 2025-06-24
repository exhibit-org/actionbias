-- Rename parent columns to family terminology
ALTER TABLE "actions" RENAME COLUMN "parent_context_summary" TO "family_context_summary";
ALTER TABLE "actions" RENAME COLUMN "parent_vision_summary" TO "family_vision_summary";