-- Add missing dependency edges between parents and children
-- Every parent should depend on its children being completed first

-- Insert dependencies for all family relationships that don't already have them
INSERT INTO edges (src, dst, kind)
SELECT 
  family.dst as src,  -- child (must be completed first)
  family.src as dst,  -- parent (depends on child)
  'depends_on' as kind
FROM edges family
LEFT JOIN edges dep ON 
  dep.src = family.dst AND 
  dep.dst = family.src AND 
  dep.kind = 'depends_on'
WHERE 
  family.kind = 'family' AND 
  dep.src IS NULL;

-- Verify the migration by checking no family relationships lack dependencies
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM edges family
  LEFT JOIN edges dep ON 
    dep.src = family.dst AND 
    dep.dst = family.src AND 
    dep.kind = 'depends_on'
  WHERE family.kind = 'family' AND dep.src IS NULL;
  
  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % family relationships still missing dependencies', missing_count;
  END IF;
END $$;