import { NextRequest, NextResponse } from 'next/server';
import { ParentSummaryService } from '../../../../lib/services/parent-summary';

export const runtime = 'nodejs';
export const maxDuration = 800;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get('actionId') || 'fc37de88-37ae-41d2-84f7-5bb230fac631';
    
    console.log(`Forcing parent summary generation for action: ${actionId}`);
    
    // Get the action details
    const parentChain = await ParentSummaryService.getParentChain(actionId);
    console.log(`Parent chain length: ${parentChain.length}`);
    
    // Build the input
    const input = {
      actionId: actionId,
      title: 'Test the completion context capture UI',
      description: 'Complete this test action to validate the completion context capture UI works properly.',
      vision: 'A working demonstration of the completion context system.',
      parentChain: parentChain
    };
    
    console.log('Generating parent summaries...');
    const { contextSummary, visionSummary } = await ParentSummaryService.generateBothParentSummaries(input);
    
    console.log(`Generated context summary length: ${contextSummary.length}`);
    console.log(`Generated vision summary length: ${visionSummary.length}`);
    
    console.log('Updating database...');
    await ParentSummaryService.updateParentSummaries(actionId, contextSummary, visionSummary);
    
    console.log('Successfully updated parent summaries');
    
    return NextResponse.json({
      success: true,
      actionId: actionId,
      contextSummaryLength: contextSummary.length,
      visionSummaryLength: visionSummary.length,
      contextPreview: contextSummary.substring(0, 200),
      visionPreview: visionSummary.substring(0, 200)
    });
    
  } catch (error) {
    console.error('Error forcing parent summary generation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}