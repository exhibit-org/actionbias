import { NextResponse } from "next/server";
import { getUnblockedActionsOptimized } from "../../../../lib/services/actions-optimized";
import { getDb } from "../../../../lib/db/adapter";
import { actions } from "../../../../db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const results: any = {
    timings: {},
    counts: {},
    errors: []
  };

  try {
    // Test 1: Count incomplete actions
    const countStart = Date.now();
    const incompleteCount = await getDb()
      .select()
      .from(actions)
      .where(eq(actions.done, false));
    results.timings.countIncomplete = Date.now() - countStart;
    results.counts.incomplete = incompleteCount.length;

    // Test 2: Run optimized query with small limit
    const smallStart = Date.now();
    try {
      const smallResult = await getUnblockedActionsOptimized(10);
      results.timings.optimized10 = Date.now() - smallStart;
      results.counts.workable10 = smallResult.length;
    } catch (e) {
      results.errors.push({ test: 'optimized10', error: (e as Error).message });
    }

    // Test 3: Run optimized query with medium limit
    const mediumStart = Date.now();
    try {
      const mediumResult = await getUnblockedActionsOptimized(50);
      results.timings.optimized50 = Date.now() - mediumStart;
      results.counts.workable50 = mediumResult.length;
    } catch (e) {
      results.errors.push({ test: 'optimized50', error: (e as Error).message });
    }

    // Test 4: Run optimized query with large limit (but not 1000)
    const largeStart = Date.now();
    try {
      const largeResult = await getUnblockedActionsOptimized(100);
      results.timings.optimized100 = Date.now() - largeStart;
      results.counts.workable100 = largeResult.length;
    } catch (e) {
      results.errors.push({ test: 'optimized100', error: (e as Error).message });
    }

    return NextResponse.json({
      success: true,
      ...results
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      ...results
    });
  }
}