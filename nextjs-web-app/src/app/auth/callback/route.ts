import { AuthService } from '@/lib/auth';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handle the authentication callback from Supabase
 * This route is called when a user clicks the confirmation link in their email
 * or when they sign in with a third-party provider like Google
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
    const { data, error } = await AuthService.exchangeCodeForSession(code, cookieStore);
    
    if (error) {
      console.error('Error exchanging code for session:', error.message);
      return NextResponse.redirect(`${requestUrl.origin}?error=auth_error`);
    }

    // For OAuth logins (like Google), extract the first name from user info
    // and store it in user metadata if it doesn't exist yet
    if (data?.user) {
      const user = data.user;
      const supabase = await AuthService.createServerClient(cookieStore);
      
      // Check if we need to update user metadata with first name
      if (!user.user_metadata?.first_name) {
        // For Google OAuth, the name is in the user_metadata.full_name
        if (user.app_metadata.provider === 'google' && user.user_metadata.full_name) {
          const fullName = user.user_metadata.full_name;
          const firstName = fullName.split(' ')[0]; // Extract first name from full name
          
          // Update user metadata with first name
          await supabase.auth.updateUser({
            data: { first_name: firstName }
          });
        }
      }
    }

    // Redirect to the dashboard page on successful authentication
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
  } catch (error) {
    console.error('Unexpected error in auth callback:', error);
    const requestUrl = new URL(request.url);
    return NextResponse.redirect(`${requestUrl.origin}?error=unexpected_error`);
  }
} 