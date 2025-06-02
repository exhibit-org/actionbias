import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[OAuth Register] POST /register received');
    const body = await request.json();
    console.log('[OAuth Register] Request body:', body);
    
    // Minimal response per RFC 7591
    const response = {
      client_id: "actionbias-mcp-client",
      client_secret: "mcp-client-secret", // Add client_secret
      token_endpoint_auth_method: "none",
      redirect_uris: body.redirect_uris || ["http://localhost:3000/callback"]
    };
    
    console.log('[OAuth Register] Sending response:', response);
    return NextResponse.json(response, { 
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
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