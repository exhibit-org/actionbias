import { NextRequest, NextResponse } from 'next/server';
import { ParentSummaryService } from '../../../../lib/services/parent-summary';

export const runtime = 'nodejs';
export const maxDuration = 800;

export async function GET(request: NextRequest) {
  try {
    console.log('Starting DEBUG parent summaries job...');
    
    // Check for actions without parent summaries
    const actionsWithoutParentSummaries = await ParentSummaryService.getActionsWithoutParentSummaries(10);
    
    console.log(`Found ${actionsWithoutParentSummaries.length} actions without parent summaries:`);
    
    return NextResponse.json({ 
      success: true, 
      actionsWithoutSummaries: actionsWithoutParentSummaries.length,
      actions: actionsWithoutParentSummaries.map(a => ({
        id: a.actionId,
        title: a.title,
        description: a.description?.substring(0, 100),
        parentChainLength: a.parentChain.length
      }))
    });

  } catch (error) {
    console.error('DEBUG parent summaries job failed:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}