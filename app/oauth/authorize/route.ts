import { NextRequest, NextResponse } from 'next/server';

// OAuth authorization endpoint
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const codeChallenge = searchParams.get('code_challenge');
  
  console.log('[OAuth] Authorization request:', {
    clientId,
    redirectUri,
    state,
    codeChallenge: codeChallenge ? 'present' : 'missing'
  });
  
  // For Claude.ai, we'll auto-approve and redirect back with an authorization code
  const authCode = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const callbackUrl = new URL(redirectUri!);
  callbackUrl.searchParams.set('code', authCode);
  if (state) {
    callbackUrl.searchParams.set('state', state);
  }
  
  console.log('[OAuth] Redirecting to:', callbackUrl.toString());
  
  return NextResponse.redirect(callbackUrl.toString());
}

export async function POST(request: NextRequest) {
  // Handle POST version of authorization request
  return GET(request);
}