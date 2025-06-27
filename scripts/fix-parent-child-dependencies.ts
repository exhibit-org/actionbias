#!/usr/bin/env tsx
/**
 * Migration script to add missing dependency relationships between parent and child actions.
 * 
 * This script ensures that every parent action has a dependency on its child actions,
 * which means the parent cannot be completed until all children are done.
 * 
 * Run with: npm run tsx scripts/fix-parent-child-dependencies.ts
 */

import { getDb } from "../lib/db/adapter";
import { actions, edges } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";

async function main() {
  console.log("Starting parent-child dependency fix...");
  
  const db = getDb();
  
  // Get all family edges
  console.log("Fetching all family relationships...");
  const familyEdges = await db
    .select({
      parent_id: edges.src,
      child_id: edges.dst,
    })
    .from(edges)
    .where(eq(edges.kind, "family"));
  
  console.log(`Found ${familyEdges.length} family relationships`);
  
  // Check each family relationship for corresponding dependency
  let missingCount = 0;
  let addedCount = 0;
  let skippedCount = 0;
  
  for (const { parent_id, child_id } of familyEdges) {
    // Check if dependency already exists
    const existingDependency = await db
      .select()
      .from(edges)
      .where(
        and(
          eq(edges.src, child_id),
          eq(edges.dst, parent_id),
          eq(edges.kind, "depends_on")
        )
      )
      .limit(1);
    
    if (existingDependency.length === 0) {
      missingCount++;
      
      // Get action details for logging
      const [parentAction, childAction] = await Promise.all([
        db.select({ title: actions.title }).from(actions).where(eq(actions.id, parent_id)).limit(1),
        db.select({ title: actions.title }).from(actions).where(eq(actions.id, child_id)).limit(1)
      ]);
      
      if (parentAction.length === 0 || childAction.length === 0) {
        console.warn(`⚠️  Skipping orphaned relationship: parent=${parent_id}, child=${child_id}`);
        skippedCount++;
        continue;
      }
      
      console.log(`Adding dependency: "${parentAction[0].title}" depends on "${childAction[0].title}"`);
      
      // Add the missing dependency
      await db.insert(edges).values({
        src: child_id,  // child must be completed first
        dst: parent_id, // parent depends on child
        kind: "depends_on",
      });
      
      addedCount++;
    }
  }
  
  console.log("\n=== Migration Summary ===");
  console.log(`Total family relationships: ${familyEdges.length}`);
  console.log(`Missing dependencies found: ${missingCount}`);
  console.log(`Dependencies added: ${addedCount}`);
  console.log(`Orphaned relationships skipped: ${skippedCount}`);
  console.log(`Already had dependencies: ${familyEdges.length - missingCount}`);
  
  // Verify the fix
  console.log("\n=== Verification ===");
  const verificationQuery = sql`
    SELECT COUNT(*) as count
    FROM ${edges} family
    LEFT JOIN ${edges} dep ON 
      dep.src = family.dst AND 
      dep.dst = family.src AND 
      dep.kind = 'depends_on'
    WHERE family.kind = 'family' AND dep.id IS NULL
  `;
  
  const verificationResult = await db.execute(verificationQuery) as any;
  const remainingMissing = verificationResult.rows?.[0]?.count || verificationResult[0]?.count || 0;
  
  if (remainingMissing > 0) {
    console.error(`❌ WARNING: ${remainingMissing} family relationships still missing dependencies!`);
  } else {
    console.log("✅ All family relationships now have corresponding dependencies!");
  }
  
  console.log("\nMigration complete!");
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});