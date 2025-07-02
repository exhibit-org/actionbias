import { NextRequest, NextResponse } from 'next/server';
import { WorkLogService } from '@/lib/services/work-log';

// View recent hook captures for verification
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const hookType = searchParams.get('type') || undefined;
    
    // Get recent hook entries
    const entries = await WorkLogService.getHookEntries(hookType, limit);
    
    // Transform for easier viewing
    const formattedEntries = entries.map(entry => ({
      id: entry.id,
      timestamp: entry.timestamp,
      hook_type: entry.metadata?.hook_type,
      tool_name: entry.metadata?.tool_name,
      session_id: entry.metadata?.session_id,
      has_payload: !!entry.metadata?.raw_payload,
      content_preview: entry.content
    }));
    
    return NextResponse.json({
      count: formattedEntries.length,
      entries: formattedEntries
    });
    
  } catch (error) {
    console.error('Error fetching hook data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hook data' },
      { status: 500 }
    );
  }
}