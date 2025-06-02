import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[OAuth Register] POST /register received');
    const body = await request.json();
    console.log('[OAuth Register] Request body:', body);
    
    const response = {
      client_id: "actionbias-mcp-client",
      client_secret: "not-required",
      registration_access_token: "not-implemented",
      registration_client_uri: `${request.nextUrl.origin}/register`,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: body.client_name || "mcp-client",
      redirect_uris: body.redirect_uris || ["http://localhost:3000/callback"],
      grant_types: body.grant_types || ["authorization_code", "refresh_token"],
      response_types: body.response_types || ["code"],
      token_endpoint_auth_method: body.token_endpoint_auth_method || "none",
      scope: body.scope || "mcp"
    };
    
    console.log('[OAuth Register] Sending response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.log('[OAuth Register] Error:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  console.log('[OAuth Register] OPTIONS /register received');
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}