-- Extract title, description, vision from JSON blob to dedicated columns
-- Only update where the new columns are NULL to avoid overwriting manually set values
UPDATE actions 
SET 
  title = COALESCE(title, data->>'title'),
  description = COALESCE(description, data->>'description'),
  vision = COALESCE(vision, data->>'vision'),
  updated_at = NOW()
WHERE 
  (title IS NULL AND data->>'title' IS NOT NULL) OR
  (description IS NULL AND data->>'description' IS NOT NULL) OR
  (vision IS NULL AND data->>'vision' IS NOT NULL);