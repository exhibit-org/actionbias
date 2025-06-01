import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    let body;
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData);
    }
    
    const { grant_type } = body;
    
    if (grant_type === 'authorization_code') {
      const response = {
        access_token: `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'mcp'
      };
      
      return NextResponse.json(response, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'Pragma': 'no-cache'
        }
      });
    }
    
    return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
}