-- Rollback: Update edge kind from 'family' back to 'child' terminology
-- NOTE: Only run this if you need to rollback the 0008_update_family_edge_kind migration
-- 
-- WARNING: This updates ALL edges with kind='family' back to 'child'
-- Consider the performance impact on large tables
UPDATE "edges" SET "kind" = 'child' WHERE "kind" = 'family';