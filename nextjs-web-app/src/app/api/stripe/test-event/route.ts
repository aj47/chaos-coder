import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('Test event endpoint called');
    
    // Parse the request body
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    // Get headers
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('Request headers:', JSON.stringify(headers, null, 2));
    
    return NextResponse.json({ success: true, message: 'Test event received' });
  } catch (error) {
    console.error('Error in test event:', error);
    return NextResponse.json({ error: 'Test event failed' }, { status: 500 });
  }
} 