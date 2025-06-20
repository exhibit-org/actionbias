import { NextRequest, NextResponse } from 'next/server';
import { SummaryService } from '../../../../lib/services/summary';

export const runtime = 'nodejs';
export const maxDuration = 800; // 800 seconds for Pro/Enterprise accounts

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  // Verify cron secret
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting node summaries cron job...');
    
    // Get actions without node summaries (limit to 50 per run to avoid timeout)
    const actionsWithoutSummaries = await SummaryService.getActionsWithoutNodeSummaries(50);
    
    if (actionsWithoutSummaries.length === 0) {
      console.log('No actions need node summaries');
      return NextResponse.json({ 
        success: true, 
        message: 'No actions need node summaries',
        processed: 0
      });
    }

    console.log(`Found ${actionsWithoutSummaries.length} actions without node summaries`);

    // Process in batches of 10 to avoid API rate limits
    const batchSize = 10;
    let totalProcessed = 0;
    
    for (let i = 0; i < actionsWithoutSummaries.length; i += batchSize) {
      const batch = actionsWithoutSummaries.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}: ${batch.length} actions`);
      
      try {
        // Generate summaries for this batch
        const summaryResults = await SummaryService.generateBatchNodeSummaries(batch);
        
        // Store each summary
        for (const result of summaryResults) {
          try {
            await SummaryService.updateNodeSummary(result.id, result.summary);
            totalProcessed++;
          } catch (error) {
            console.error(`Failed to store summary for action ${result.id}:`, error);
          }
        }
        
        console.log(`Completed batch ${Math.floor(i / batchSize) + 1}: processed ${summaryResults.length} summaries`);
        
        // Small delay between batches to be respectful to API limits
        if (i + batchSize < actionsWithoutSummaries.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Error processing batch ${Math.floor(i / batchSize) + 1}:`, error);
        // Continue with next batch even if this one fails
      }
    }

    // Get updated stats
    const stats = await SummaryService.getNodeSummaryStats();
    
    console.log(`Node summaries cron job completed. Processed: ${totalProcessed}, Stats:`, stats);
    
    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      stats
    });

  } catch (error) {
    console.error('Node summaries cron job failed:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}