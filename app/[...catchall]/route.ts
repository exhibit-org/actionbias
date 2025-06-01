import { NextRequest, NextResponse } from 'next/server';

// Universal request logger to see what Claude.ai is requesting
async function logRequest(method: string, request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  let body = '';
  try {
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      body = await request.clone().text();
    }
  } catch (e) {
    body = 'Failed to read body';
  }
  
  const logData = {
    method,
    pathname,
    searchParams: Object.fromEntries(url.searchParams),
    headers: Object.fromEntries(request.headers.entries()),
    body: body || undefined,
    timestamp: new Date().toISOString()
  };
  
  console.log(`[CATCHALL] ${method} ${pathname}:`, JSON.stringify(logData, null, 2));
  
  // Return different responses based on path
  if (pathname === '/register') {
    return NextResponse.json({
      client_id: 'actionbias-mcp-client',
      client_secret: 'not-required',
      registration_access_token: 'not-implemented',
      registration_client_uri: `${url.origin}/register`,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: 'claudeai',
      redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: 'claudeai'
    });
  }
  
  if (pathname === '/oauth/authorize') {
    const clientId = url.searchParams.get('client_id');
    const redirectUri = url.searchParams.get('redirect_uri');
    const state = url.searchParams.get('state');
    
    const authCode = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const callbackUrl = new URL(redirectUri!);
    callbackUrl.searchParams.set('code', authCode);
    if (state) {
      callbackUrl.searchParams.set('state', state);
    }
    
    return NextResponse.redirect(callbackUrl.toString());
  }
  
  if (pathname === '/auth/token' || pathname === '/oauth/token') {
    return NextResponse.json({
      access_token: `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'claudeai',
      refresh_token: `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }
  
  if (pathname === '/.well-known/oauth-authorization-server') {
    return NextResponse.json({
      issuer: url.origin,
      authorization_endpoint: `${url.origin}/oauth/authorize`,
      token_endpoint: `${url.origin}/auth/token`,
      registration_endpoint: `${url.origin}/register`,
      scopes_supported: ['claudeai'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_basic'],
      code_challenge_methods_supported: ['S256'],
      service_documentation: `${url.origin}/docs`
    });
  }
  
  // For any other request, return a generic response with the request info
  return NextResponse.json({
    message: 'Request logged',
    path: pathname,
    method,
    timestamp: new Date().toISOString(),
    note: 'This is a debug endpoint to capture all requests'
  }, { status: 200 });
}

export async function GET(request: NextRequest) {
  return logRequest('GET', request);
}

export async function POST(request: NextRequest) {
  return logRequest('POST', request);
}

export async function PUT(request: NextRequest) {
  return logRequest('PUT', request);
}

export async function DELETE(request: NextRequest) {
  return logRequest('DELETE', request);
}

export async function PATCH(request: NextRequest) {
  return logRequest('PATCH', request);
}

export async function OPTIONS(request: NextRequest) {
  return logRequest('OPTIONS', request);
}