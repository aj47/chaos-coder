import { NextResponse } from "next/server";
import { SupabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Using Node.js runtime for better cookie handling
// export const runtime = "edge";

/**
 * POST /api/auth/signup
 * Signs up a new user with email, password, and first name
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const { email, password, firstName } = await request.json();

    // Validate the request
    if (!email || !password) {
      return NextResponse.json({
        error: "Email and password are required"
      }, { status: 400 });
    }

    // Create the user with the admin client
    const { data, error } = await SupabaseAdmin.createUser(email, password, {
      first_name: firstName || '',
    });

    if (error) {
      console.error('Error signing up:', error);
      return NextResponse.json({
        error: error.message
      }, { status: 400 });
    }

    // Sign in the user automatically using the server client with cookie handling
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('Error signing in after signup:', signInError);
      // Return success for signup but note the sign-in issue
      return NextResponse.json({
        user: data.user,
        signInError: signInError.message
      }, { status: 201 });
    }

    // Create a response with the session data
    const response = NextResponse.json({
      user: signInData.user,
      session: {
        // Only return non-sensitive session info
        expires_at: signInData.session?.expires_at,
        expires_in: signInData.session?.expires_in,
      }
    }, { status: 201 });

    // The cookies are automatically handled by the Supabase client
    // We don't need to manually set them
    console.log('\n[SERVER] Cookies are automatically set by the Supabase client for signup');

    // Disable manual cookie setting
    if (false) {
      console.log('\n[SERVER] Setting session cookies for signup');

      // Extract project ref from the URL for the Supabase cookie name
      const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^\.]+)\./)?.[1] || '';
      const supabaseCookieName = projectRef ? `sb-${projectRef}-auth-token` : 'sb-auth-token';

      // Create the Supabase cookie value
      const supabaseCookieValue = JSON.stringify({
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_at: signInData.session.expires_at,
        expires_in: signInData.session.expires_in,
      });

      // Set the Supabase cookie
      response.cookies.set(supabaseCookieName, supabaseCookieValue, {
        path: '/',
        maxAge: signInData.session.expires_in,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      // Also set the individual token cookies for compatibility
      response.cookies.set('sb-access-token', signInData.session.access_token, {
        path: '/',
        maxAge: signInData.session.expires_in,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      response.cookies.set('sb-refresh-token', signInData.session.refresh_token, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      console.log(`\n[SERVER] Cookies set for signup: ${supabaseCookieName}, sb-access-token, sb-refresh-token`);

    }

    return response;
  } catch (error) {
    console.error('Error in /api/auth/signup:', error);
    return NextResponse.json({
      error: 'Failed to sign up'
    }, { status: 500 });
  }
}