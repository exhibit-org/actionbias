import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
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
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
}