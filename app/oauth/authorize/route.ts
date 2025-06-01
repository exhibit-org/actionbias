import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  
  const authCode = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const callbackUrl = new URL(redirectUri!);
  callbackUrl.searchParams.set('code', authCode);
  if (state) {
    callbackUrl.searchParams.set('state', state);
  }
  
  return NextResponse.redirect(callbackUrl.toString());
}