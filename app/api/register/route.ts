import { NextRequest, NextResponse } from 'next/server';

// MCP server registration endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Return server capabilities and metadata
    return NextResponse.json({
      capabilities: {
        tools: {
          create_action: {
            description: "Create a new action in the database",
          },
        },
      },
      serverInfo: {
        name: "actionbias-mcp-server",
        version: "0.1.0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}