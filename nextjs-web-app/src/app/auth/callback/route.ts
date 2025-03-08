import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handle the authentication callback from Supabase
 * This route is called when a user clicks the confirmation link in their email
 * or completes an OAuth login flow (like Google)
 */
export async function GET(request: NextRequest) {
  console.log("[DEBUG] Auth callback route called");
  
  try {
    const requestUrl = new URL(request.url);
    console.log("[DEBUG] Auth callback URL:", requestUrl.toString());
    
    const code = requestUrl.searchParams.get('code');
    console.log("[DEBUG] Auth code exists:", !!code);
    
    // Get the redirect URL if it exists
    const redirectTo = requestUrl.searchParams.get('redirect') || '/dashboard';
    console.log("[DEBUG] Redirect destination:", redirectTo);

    if (!code) {
      console.error('[DEBUG] No code provided in authentication callback');
      // Redirect to error page or home with error parameter
      return NextResponse.redirect(`${requestUrl.origin}?error=missing_code`);
    }

    // Get cookie store and create Supabase client
    const cookieStore = await cookies();
    console.log("[DEBUG] Cookie store initialized");
    
    // Create the Supabase client with the cookie store
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore
    });
    console.log("[DEBUG] Supabase route handler client created");
    
    // Exchange the code for a session
    console.log("[DEBUG] Exchanging code for session");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('[DEBUG] Error exchanging code for session:', error.message);
      return NextResponse.redirect(`${requestUrl.origin}?error=auth_error`);
    }

    console.log("[DEBUG] Session exchange successful");
    console.log("[DEBUG] User authenticated:", data.user?.id);
    console.log("[DEBUG] Session expires at:", data.session ? new Date(data.session.expires_at! * 1000).toISOString() : "No session");

    // For OAuth logins (like Google), extract the first name from user info
    // and store it in user metadata if it doesn't exist yet
    if (data?.user) {
      const user = data.user;
      console.log("[DEBUG] User metadata:", JSON.stringify(user.user_metadata));
      
      // Check if we need to update user metadata with first name
      if (!user.user_metadata?.first_name) {
        console.log("[DEBUG] First name not found in user metadata, attempting to extract from OAuth data");
        
        // For Google OAuth, the name is in the user_metadata.full_name
        if (user.app_metadata.provider === 'google' && user.user_metadata.full_name) {
          const fullName = user.user_metadata.full_name;
          const firstName = fullName.split(' ')[0]; // Extract first name from full name
          
          console.log("[DEBUG] Extracted first name from full name:", firstName);
          
          // Update user metadata with first name
          console.log("[DEBUG] Updating user metadata with first name");
          await supabase.auth.updateUser({
            data: { first_name: firstName }
          });
        }
      }
    }

    // Create a response with the session cookie properly set
    console.log("[DEBUG] Creating redirect response to:", `${requestUrl.origin}${redirectTo}`);
    const response = NextResponse.redirect(`${requestUrl.origin}${redirectTo}`);
    
    // Log all cookies that were set
    console.log("[DEBUG] Cookies in the response:", response.headers.get('set-cookie'));
    
    // Return the response with the session cookie
    return response;
  } catch (err) {
    console.error('[DEBUG] Unexpected error in auth callback:', err);
    const requestUrl = new URL(request.url);
    return NextResponse.redirect(`${requestUrl.origin}?error=server_error`);
  }
} 