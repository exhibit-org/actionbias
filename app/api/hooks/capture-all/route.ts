import { NextRequest, NextResponse } from 'next/server';
import { WorkLogService } from '@/lib/services/work-log';

// Ultra-fast hook capture endpoint
// Returns immediately, stores data asynchronously
export async function POST(request: NextRequest) {
  try {
    // Parse the hook payload from Claude Code
    const hookData = await request.json();
    
    // Fire-and-forget storage - don't await
    storeHookDataAsync(hookData).catch(error => {
      // Log error but don't block response
      console.error('Hook storage failed:', error);
    });
    
    // Return immediately for optimal DX
    return NextResponse.json({ status: 'captured' }, { status: 200 });
    
  } catch (error) {
    // Even on error, return quickly to avoid slowing Claude Code
    console.error('Hook capture error:', error);
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}

// Async storage function - runs in background
async function storeHookDataAsync(hookData: any) {
  // Determine hook type from the payload
  const hookType = determineHookType(hookData);
  
  // Store raw hook data using optimized fire-and-forget method
  await WorkLogService.addHookEntryAsync({
    content: `claude_code_hook:${hookType}`,
    metadata: {
      hook_type: hookType,
      raw_payload: hookData,
      captured_at: new Date().toISOString(),
      tool_name: hookData?.tool?.name,
      session_id: hookData?.sessionId,
      user_id: hookData?.userId
    }
  });
}

// Extract hook type from Claude Code payload
function determineHookType(hookData: any): string {
  // Based on Claude Code hooks documentation structure
  if (hookData?.event === 'pre_tool_use') return 'pre_tool_use';
  if (hookData?.event === 'post_tool_use') return 'post_tool_use';
  if (hookData?.event === 'notification') return 'notification';
  if (hookData?.event === 'stop') return 'stop';
  
  // Fallback: try to infer from other fields
  if (hookData?.tool) return 'tool_use';
  if (hookData?.type) return hookData.type;
  
  return 'unknown';
}