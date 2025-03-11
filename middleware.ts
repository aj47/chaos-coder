import { NextRequest } from 'next/server';
import { updateSession } from '@/lib/auth';

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/stripe/webhook (Stripe webhooks)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/stripe/webhook|_next/static|_next/image|favicon.ico|public/).*)',
  ],
};

export default async function middleware(request: NextRequest) {
  return await updateSession(request);
} 