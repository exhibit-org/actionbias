import { NextRequest, NextResponse } from 'next/server';
import { WorkLogService } from '@/lib/services/work-log';

// Ultra-fast hook capture endpoint
// Returns immediately, stores data asynchronously
export async function POST(request: NextRequest) {
  try {
    // Comprehensive debug logging
    console.log('=== HOOK REQUEST DEBUG ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('URL:', request.url);
    console.log('Method:', request.method);
    
    // Log all headers
    console.log('Headers:');
    request.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    
    // Get raw body first for debugging
    const text = await request.text();
    console.log('Raw body:', JSON.stringify(text));
    console.log('Body length:', text.length);
    console.log('Body type:', typeof text);
    
    // Try to determine if body is valid JSON
    let isValidJson = false;
    try {
      if (text) {
        JSON.parse(text);
        isValidJson = true;
      }
    } catch (e) {
      console.log('Body is not valid JSON:', e);
    }
    console.log('Is valid JSON:', isValidJson);
    console.log('=== END DEBUG ===');
    
    // Parse the hook payload from Claude Code
    const hookData = text ? JSON.parse(text) : {};
    
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
  
  // Extract agent/session information from the actual structure
  const sessionId = hookData?.session_id;
  const toolName = hookData?.tool_name;
  const command = hookData?.tool_input?.command;
  const description = hookData?.tool_input?.description;
  
  // Create rich content description for agent identification
  const content = sessionId 
    ? `agent:${sessionId}:${hookType}:${toolName || 'unknown'}`
    : `claude_code_hook:${hookType}`;
  
  // Store comprehensive hook data using work log service
  await WorkLogService.addEntry({
    content,
    metadata: {
      hook_type: hookType,
      session_id: sessionId,
      tool_name: toolName,
      command,
      description,
      transcript_path: hookData?.transcript_path,
      raw_payload: hookData,
      captured_at: new Date().toISOString()
    }
  });
}

// Extract hook type from Claude Code payload
function determineHookType(hookData: any): string {
  // Use the hook_event_name field from the actual structure
  if (hookData?.hook_event_name) return hookData.hook_event_name.toLowerCase();
  
  // Legacy fallbacks
  if (hookData?.event === 'pre_tool_use') return 'pre_tool_use';
  if (hookData?.event === 'post_tool_use') return 'post_tool_use';
  if (hookData?.event === 'notification') return 'notification';
  if (hookData?.event === 'stop') return 'stop';
  
  // Fallback: try to infer from other fields
  if (hookData?.tool) return 'tool_use';
  if (hookData?.type) return hookData.type;
  
  return 'unknown';
}