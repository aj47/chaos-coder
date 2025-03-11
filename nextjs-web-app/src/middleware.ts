import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/auth';

export default async function middleware(request: NextRequest) {
  // Skip auth for Stripe webhook
  if (request.nextUrl.pathname === '/api/stripe/webhook') {
    return NextResponse.next();
  }

  try {
    return await updateSession(request);
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, still allow webhook requests
    if (request.nextUrl.pathname === '/api/stripe/webhook') {
      return NextResponse.next();
    }
    // For other routes, redirect to home page
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  matcher: [
    // Protected API routes except webhook
    '/api/((?!stripe/webhook).*)',
    // Protected pages
    '/dashboard/:path*',
    '/account/:path*',
  ]
}; 