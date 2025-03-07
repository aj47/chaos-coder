import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handle the authentication callback from Supabase
 * This route is called when a user clicks the confirmation link in their email
 */
export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');

    if (!code) {
      console.error('No code provided in authentication callback');
      // Redirect to error page or home with error parameter
      return NextResponse.redirect(`${requestUrl.origin}?error=missing_code`);
    }

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Error exchanging code for session:', error.message);
      return NextResponse.redirect(`${requestUrl.origin}?error=auth_error`);
    }

    // URL to redirect to after sign in process completes - redirect to dashboard
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
  } catch (err) {
    console.error('Unexpected error in auth callback:', err);
    const requestUrl = new URL(request.url);
    return NextResponse.redirect(`${requestUrl.origin}?error=server_error`);
  }
} 