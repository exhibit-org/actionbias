import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  
  const metadata = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/auth/token`,
    registration_endpoint: `${baseUrl}/register`,
    scopes_supported: ['claudeai'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_basic'],
    code_challenge_methods_supported: ['S256'],
    service_documentation: `${baseUrl}/docs`
  };
  
  return NextResponse.json(metadata, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// Handle CORS preflight
export async function OPTIONS() {
  console.log('[OAuth Discovery] OPTIONS /.well-known/oauth-authorization-server received');
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}