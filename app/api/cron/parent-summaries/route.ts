import { NextRequest, NextResponse } from 'next/server';
import { ParentSummaryService } from '../../../../lib/services/parent-summary';

export const runtime = 'nodejs';
export const maxDuration = 800; // 800 seconds for Pro/Enterprise accounts

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  // Verify cron secret
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting parent summaries cron job...');
    
    // Get actions without parent summaries (limit to 20 per run due to complexity)
    const actionsWithoutParentSummaries = await ParentSummaryService.getActionsWithoutParentSummaries(20);
    
    if (actionsWithoutParentSummaries.length === 0) {
      console.log('No actions need parent summaries');
      return NextResponse.json({ 
        success: true, 
        message: 'No actions need parent summaries',
        processed: 0
      });
    }

    console.log(`Found ${actionsWithoutParentSummaries.length} actions without parent summaries`);

    // Process in batches of 2 to avoid API rate limits (parent summaries are complex with long prompts)
    const batchSize = 2;
    let totalProcessed = 0;
    
    for (let i = 0; i < actionsWithoutParentSummaries.length; i += batchSize) {
      const batch = actionsWithoutParentSummaries.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}: ${batch.length} actions`);
      
      try {
        // Generate parent summaries for this batch
        const summaryResults = await ParentSummaryService.generateBatchParentSummaries(batch);
        
        // Store each summary
        for (const result of summaryResults) {
          try {
            await ParentSummaryService.updateParentSummaries(
              result.id, 
              result.contextSummary, 
              result.visionSummary
            );
            totalProcessed++;
          } catch (error) {
            console.error(`Failed to store parent summaries for action ${result.id}:`, error);
          }
        }
        
        console.log(`Completed batch ${Math.floor(i / batchSize) + 1}: processed ${summaryResults.length} parent summaries`);
        
        // Small delay between batches to be respectful to API limits
        if (i + batchSize < actionsWithoutParentSummaries.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error processing batch ${Math.floor(i / batchSize) + 1}:`, error);
        // Continue with next batch even if this one fails
      }
    }

    // Get updated stats (with error handling)
    let stats;
    try {
      stats = await ParentSummaryService.getParentSummaryStats();
    } catch (error) {
      console.error('Failed to get parent summary stats:', error);
      stats = {
        totalActions: 0,
        actionsWithParentSummaries: 0,
        actionsWithoutParentSummaries: 0,
        coveragePercentage: 0
      };
    }
    
    console.log(`Parent summaries cron job completed. Processed: ${totalProcessed}, Stats:`, stats);
    
    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      stats
    });

  } catch (error) {
    console.error('Parent summaries cron job failed:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}