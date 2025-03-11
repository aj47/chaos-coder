import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/auth';

export default async function middleware(request: NextRequest) {
  // Skip auth for Stripe webhook
  if (request.nextUrl.pathname === '/api/stripe/webhook') {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    // Protected API routes
    '/api/:path*',
    
    // Protected pages
    '/dashboard/:path*',
    '/account/:path*',
    
    // Exclude static files and Stripe webhook
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
}; 