import { NextRequest, NextResponse } from 'next/server';
import { SubtreeSummaryService } from '../../../../lib/services/subtree-summary';

export const runtime = 'nodejs';
export const maxDuration = 800; // 800 seconds for Pro/Enterprise accounts

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  // Verify cron secret
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting subtree summaries cron job...');
    
    // Get actions without subtree summaries (limit to 30 per run due to complexity)
    const actionsWithoutSubtreeSummaries = await SubtreeSummaryService.getActionsWithoutSubtreeSummaries(30);
    
    if (actionsWithoutSubtreeSummaries.length === 0) {
      console.log('No actions need subtree summaries');
      return NextResponse.json({ 
        success: true, 
        message: 'No actions need subtree summaries',
        processed: 0
      });
    }

    console.log(`Found ${actionsWithoutSubtreeSummaries.length} actions without subtree summaries`);

    // Process in batches of 3 to avoid API rate limits (subtree summaries are complex)
    const batchSize = 3;
    let totalProcessed = 0;
    
    for (let i = 0; i < actionsWithoutSubtreeSummaries.length; i += batchSize) {
      const batch = actionsWithoutSubtreeSummaries.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}: ${batch.length} actions`);
      
      try {
        // Generate subtree summaries for this batch
        const summaryResults = await SubtreeSummaryService.generateBatchSubtreeSummaries(batch);
        
        // Store each summary
        for (const result of summaryResults) {
          try {
            await SubtreeSummaryService.updateSubtreeSummary(result.id, result.summary);
            totalProcessed++;
          } catch (error) {
            console.error(`Failed to store subtree summary for action ${result.id}:`, error);
          }
        }
        
        console.log(`Completed batch ${Math.floor(i / batchSize) + 1}: processed ${summaryResults.length} subtree summaries`);
        
        // Small delay between batches to be respectful to API limits
        if (i + batchSize < actionsWithoutSubtreeSummaries.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`Error processing batch ${Math.floor(i / batchSize) + 1}:`, error);
        // Continue with next batch even if this one fails
      }
    }

    // Get updated stats (with error handling)
    let stats;
    try {
      stats = await SubtreeSummaryService.getSubtreeSummaryStats();
    } catch (error) {
      console.error('Failed to get subtree summary stats:', error);
      stats = {
        totalParentActions: 0,
        actionsWithSubtreeSummaries: 0,
        actionsWithoutSubtreeSummaries: 0,
        coveragePercentage: 0
      };
    }
    
    console.log(`Subtree summaries cron job completed. Processed: ${totalProcessed}, Stats:`, stats);
    
    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      stats
    });

  } catch (error) {
    console.error('Subtree summaries cron job failed:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}