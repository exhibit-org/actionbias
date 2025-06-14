// Validate authentication
export function validateAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  // Accept any token that starts with 'access_' (from our OAuth flow) OR 'test-token' for testing
  return token.startsWith('access_') || token === 'test-token';
}

// Check if request is from the web interface (same origin)
export function isWebInterfaceRequest(request: Request): boolean {
  const url = new URL(request.url);
  const referer = request.headers.get('referer');
  const origin = request.headers.get('origin');
  
  // Check if request comes from the same domain (web interface)
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host === url.host) {
        return true;
      }
    } catch (e) {
      // Invalid referer URL, ignore
    }
  }
  
  // Check origin header
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host === url.host) {
        return true;
      }
    } catch (e) {
      // Invalid origin URL, ignore
    }
  }
  
  return false;
}

export async function authenticatedHandler(method: string, request: Request, handler: (request: Request) => Promise<Response>) {
  const url = new URL(request.url);
  const transport = url.pathname.substring(1); // Remove leading slash
  
  console.log(`[MCP Auth] ${method} ${url.pathname} received`);
  
  // Only handle MCP transport paths, exclude static files  
  if (!['sse', 'mcp', 'message'].includes(transport) || transport.includes('.')) {
    console.log(`[MCP Auth] Not an MCP transport path: ${transport}`);
    return new Response('Not Found', { status: 404 });
  }
  
  // SSE endpoint GET requests are for establishing the event stream connection
  // Check for authentication on SSE connection, but allow through even if missing for now
  if (transport === 'sse' && method === 'GET') {
    console.log('[MCP Auth] SSE connection establishment');
    console.log('[MCP Auth] SSE Headers:', Object.fromEntries(request.headers.entries()));
    if (validateAuth(request)) {
      console.log('[MCP Auth] SSE authenticated - allowing through');
    } else {
      console.log('[MCP Auth] SSE not authenticated - allowing through anyway for connection establishment');
    }
    return handler(request);
  }
  
  // Message endpoint - check if this is an exploratory request or authenticated request
  if (transport === 'message') {
    console.log('[MCP Auth] Message endpoint request');
    console.log('[MCP Auth] Headers:', Object.fromEntries(request.headers.entries()));
    console.log('[MCP Auth] URL:', request.url);
    
    if (!validateAuth(request)) {
      console.log('[MCP Auth] Message endpoint - no authentication, allowing through for discovery');
      // Allow through for discovery/exploration
    } else {
      console.log('[MCP Auth] Message endpoint - authenticated request');
    }
    return handler(request);
  }
  
  // All other requests require authentication
  if (!validateAuth(request)) {
    console.log('[MCP Auth] Authentication failed');
    return new Response('Unauthorized', { status: 401 });
  }
  
  console.log('[MCP Auth] Authentication successful');
  console.log('[MCP Auth] Forwarding to MCP handler');
  
  return handler(request);
}