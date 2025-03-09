import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body but don't use it in production
    await request.json();
    
    // Return a success response
    return NextResponse.json({ 
      message: 'Test event received',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Handle error without logging to console
    return NextResponse.json(
      { error: 'Failed to process test event' },
      { status: 500 }
    );
  }
} 