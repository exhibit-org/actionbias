-- Update edge kind from 'child' to 'family' terminology
UPDATE "edges" SET "kind" = 'family' WHERE "kind" = 'child';