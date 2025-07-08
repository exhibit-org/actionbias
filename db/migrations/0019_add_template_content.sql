-- Add template_content JSONB column for multiple template support
ALTER TABLE "completion_contexts" ADD COLUMN "template_content" jsonb;