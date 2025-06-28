-- Remove unused structured_data column from completion_contexts
ALTER TABLE "completion_contexts" DROP COLUMN IF EXISTS "structured_data";