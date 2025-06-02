import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[OAuth Token] POST /auth/token received');
    let body;
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData);
    }
    
    console.log('[OAuth Token] Request body:', body);
    const { grant_type } = body;
    
    if (grant_type === 'authorization_code') {
      const response = {
        access_token: `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'mcp'
      };
      
      console.log('[OAuth Token] Sending response:', response);
      return NextResponse.json(response, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'Pragma': 'no-cache',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    return NextResponse.json({ error: 'unsupported_grant_type' }, { 
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    console.log('[OAuth Token] Error:', error);
    return NextResponse.json({ error: 'invalid_request' }, { 
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
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