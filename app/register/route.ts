import { NextRequest, NextResponse } from 'next/server';

// OAuth Dynamic Client Registration endpoint for Claude.ai
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[OAuth] Registration request:', body);
    
    // Return minimal OAuth client registration response
    const response = {
      client_id: "actionbias-mcp-client",
      client_secret: "not-required", // Claude.ai uses PKCE
      registration_access_token: "not-implemented",
      registration_client_uri: `${request.nextUrl.origin}/register`,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: body.client_name || "claudeai",
      redirect_uris: body.redirect_uris || ["https://claude.ai/api/mcp/auth_callback"],
      grant_types: body.grant_types || ["authorization_code", "refresh_token"],
      response_types: body.response_types || ["code"],
      token_endpoint_auth_method: body.token_endpoint_auth_method || "none",
      scope: body.scope || "claudeai"
    };
    
    console.log('[OAuth] Registration response:', response);
    
    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    console.error('[OAuth] Registration error:', error);
    return NextResponse.json(
      { 
        error: 'invalid_request',
        error_description: 'Invalid registration request'
      },
      { status: 400 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}