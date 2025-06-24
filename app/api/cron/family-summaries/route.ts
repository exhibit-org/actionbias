import { NextRequest, NextResponse } from 'next/server';
import { FamilySummaryService } from '../../../../lib/services/family-summary';

export const runtime = 'nodejs';
export const maxDuration = 800; // 800 seconds for Pro/Enterprise accounts

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  // Verify cron secret
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting family summaries cron job...');
    
    // Get actions without family summaries (limit to 20 per run due to complexity)
    const actionsWithoutFamilySummaries = await FamilySummaryService.getActionsWithoutFamilySummaries(20);
    
    if (actionsWithoutFamilySummaries.length === 0) {
      console.log('No actions need family summaries');
      return NextResponse.json({ 
        success: true, 
        message: 'No actions need family summaries',
        processed: 0
      });
    }

    console.log(`Found ${actionsWithoutFamilySummaries.length} actions without family summaries`);

    // Process in batches of 2 to avoid API rate limits (family summaries are complex with long prompts)
    const batchSize = 2;
    let totalProcessed = 0;
    
    for (let i = 0; i < actionsWithoutFamilySummaries.length; i += batchSize) {
      const batch = actionsWithoutFamilySummaries.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}: ${batch.length} actions`);
      
      try {
        // Generate family summaries for this batch
        const summaryResults = await FamilySummaryService.generateBatchFamilySummaries(batch);
        
        // Store each summary
        for (const result of summaryResults) {
          try {
            await FamilySummaryService.updateFamilySummaries(
              result.id, 
              result.contextSummary, 
              result.visionSummary
            );
            totalProcessed++;
          } catch (error) {
            console.error(`Failed to store family summaries for action ${result.id}:`, error);
          }
        }
        
        console.log(`Completed batch ${Math.floor(i / batchSize) + 1}: processed ${summaryResults.length} family summaries`);
        
        // Small delay between batches to be respectful to API limits
        if (i + batchSize < actionsWithoutFamilySummaries.length) {
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
      stats = await FamilySummaryService.getFamilySummaryStats();
    } catch (error) {
      console.error('Failed to get family summary stats:', error);
      stats = {
        totalActions: 0,
        actionsWithFamilySummaries: 0,
        actionsWithoutFamilySummaries: 0,
        coveragePercentage: 0
      };
    }
    
    console.log(`Family summaries cron job completed. Processed: ${totalProcessed}, Stats:`, stats);
    
    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      stats
    });

  } catch (error) {
    console.error('Family summaries cron job failed:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}