import { NextRequest, NextResponse } from 'next/server';
import { ParentSummaryService } from '../../../../lib/services/parent-summary';

export const runtime = 'nodejs';
export const maxDuration = 800;

export async function GET(request: NextRequest) {
  try {
    console.log('Starting DEBUG parent summaries job...');
    
    // First, let's see what actions are missing parent summaries
    console.log('Checking for actions without parent summaries...');
    
    const actionsWithoutParentSummaries = await ParentSummaryService.getActionsWithoutParentSummaries(5);
    
    console.log(`Found ${actionsWithoutParentSummaries.length} actions without parent summaries:`);
    console.log(actionsWithoutParentSummaries.map(a => `${a.actionId}: ${a.title}`));
    
    if (actionsWithoutParentSummaries.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No actions need parent summaries',
        processed: 0
      });
    }

    // Process just the first action for debugging
    const testAction = actionsWithoutParentSummaries[0];
    console.log(`Processing test action: ${testAction.actionId} - ${testAction.title}`);
    
    try {
      const { contextSummary, visionSummary } = await ParentSummaryService.generateBothParentSummaries(testAction);
      console.log('Generated summaries:', { contextSummary: contextSummary.substring(0, 100), visionSummary: visionSummary.substring(0, 100) });
      
      await ParentSummaryService.updateParentSummaries(testAction.actionId, contextSummary, visionSummary);
      console.log('Successfully updated parent summaries for action:', testAction.actionId);
      
      return NextResponse.json({
        success: true,
        processed: 1,
        testAction: {
          id: testAction.actionId,
          title: testAction.title,
          contextSummary: contextSummary.substring(0, 200),
          visionSummary: visionSummary.substring(0, 200)
        }
      });
    } catch (error) {
      console.error('Error processing test action:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to process test action',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('DEBUG parent summaries job failed:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}