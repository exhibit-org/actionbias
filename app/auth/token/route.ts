import { NextRequest, NextResponse } from 'next/server';

// OAuth token endpoint (alternative path)
export async function POST(request: NextRequest) {
  try {
    // Handle both JSON and form-encoded requests
    let body;
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      // Parse form data
      const formData = await request.formData();
      body = Object.fromEntries(formData);
    }
    
    console.log('[OAuth] Token request at /auth/token:', body);
    
    const { grant_type, code, client_id, code_verifier } = body;
    
    if (grant_type === 'authorization_code') {
      // Return access token for authorization code grant
      const response = {
        access_token: `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'claudeai',
        refresh_token: `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      console.log('[OAuth] Token response:', response);
      
      return NextResponse.json(response, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'Pragma': 'no-cache'
        }
      });
    }
    
    return NextResponse.json(
      { 
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported'
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[OAuth] Token error at /auth/token:', error);
    return NextResponse.json(
      { 
        error: 'invalid_request',
        error_description: 'Invalid token request'
      },
      { status: 400 }
    );
  }
}