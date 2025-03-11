import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createServerClient as createServerClientSSR } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';

// Import cookies conditionally to avoid errors in client components
let cookies: any;
try {
  cookies = require('next/headers').cookies;
} catch (error) {
  // We're in a client component or environment that doesn't support cookies
  // This is ok, we'll use an alternative approach for server contexts
}

/**
 * Centralized auth service that provides methods for all authentication-related operations
 */
export class AuthService {
  /**
   * Create a client-side Supabase client
   */
  static createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase environment variables are not set correctly!");
      
      if (process.env.NODE_ENV === 'development') {
        console.error(`
          Please ensure you have the following in your .env file:
          NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
          NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
        `);
      }
    }
    
    return createClientComponentClient<Database>({
      supabaseUrl: supabaseUrl || '',
      supabaseKey: supabaseKey || '',
    });
  }

  /**
   * Create a server-side Supabase client for API routes and server components
   * 
   * Note: This function may need different implementations depending on whether it's
   * called from an app directory server component or pages directory API route.
   */
  static async createServerClient(cookieStore?: any) {
    // If cookies is available and no cookieStore provided, use cookies() from next/headers
    if (!cookieStore && typeof cookies?.() === 'function') {
      cookieStore = await cookies();
    }
    
    console.log('AuthService: Creating server client with cookie store:', !!cookieStore);
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("AuthService: Supabase environment variables are not set correctly for server client!");
    }
    
    // If we have a valid cookieStore, use it
    if (cookieStore) {
      console.log('AuthService: Using cookie store for server client');
      return createClientComponentClient<Database>({
        cookies: () => cookieStore
      });
    }
    
    // Fallback to anon client if no cookies available (handle via JWT if needed)
    console.log('AuthService: Falling back to anon client (no cookie store)');
    return createClientComponentClient<Database>({
      supabaseUrl: supabaseUrl || '',
      supabaseKey: supabaseKey || '',
    });
  }

  /**
   * Create a Supabase client for middleware
   */
  static createMiddlewareClient(request: NextRequest) {
    return createServerClientSSR(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          set(name, value, options) {
            // This is handled in the middleware
          },
          remove(name, options) {
            // This is handled in the middleware  
          },
        },
      }
    );
  }

  /**
   * Update the auth session in middleware
   */
  static async updateSession(request: NextRequest) {
    console.log('AuthService: Updating session in middleware');
    
    // Log request cookies for debugging
    const cookieHeader = request.headers.get('cookie');
    console.log('AuthService: Request cookies header exists:', !!cookieHeader);
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map(c => c.trim());
      const authCookies = cookies.filter(c => c.startsWith('sb-') || c.includes('supabase'));
      console.log('AuthService: Auth cookies found:', authCookies.length > 0, 
        authCookies.map(c => c.split('=')[0]));
    }
    
    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = this.createMiddlewareClient(request);
    console.log('AuthService: Middleware client created');

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('AuthService: Middleware auth check - User exists:', !!user);

      // Don't treat missing session as an error
      if (userError && userError.name !== 'AuthSessionMissingError') {
        console.error('AuthService: Error in auth middleware:', userError);
        await supabase.auth.signOut();
        return response;
      }

      if (user) {
        console.log('AuthService: User authenticated in middleware:', { id: user.id });
        // Verify the user exists in the database
        const { error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('AuthService: User profile not found in middleware:', profileError);
          await supabase.auth.signOut();
        } else {
          console.log('AuthService: User profile verified in middleware');
        }
      }
    } catch (error) {
      // Only log and handle actual errors, not missing sessions
      if (error instanceof Error && error.name !== 'AuthSessionMissingError') {
        console.error('AuthService: Error in middleware:', error);
        await supabase.auth.signOut();
      } else {
        console.log('AuthService: No session in middleware');
      }
    }

    return response;
  }

  /**
   * Get the current user
   */
  static async getCurrentUser(supabase: Database['supabase']) {
    try {
      console.log('AuthService: Getting current user');
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error && error.name !== 'AuthSessionMissingError') {
        console.error('AuthService: Error getting current user:', error);
        return { user: null, error };
      }
      
      if (user) {
        console.log('AuthService: User found:', { id: user.id, email: user.email });
      } else {
        console.log('AuthService: No user found');
      }
      
      return { user, error: null };
    } catch (error) {
      console.error('AuthService: Unexpected error getting current user:', error);
      return { user: null, error };
    }
  }

  /**
   * Verify that a user exists in the database
   */
  static async verifyUserProfile(supabase: Database['supabase'], userId: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('User profile verification failed:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Unexpected error verifying user profile:', error);
      return false;
    }
  }

  /**
   * Sign up a new user
   */
  static async signUp(email: string, password: string, firstName: string = 'User') {
    const supabase = this.createClient();
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim() || 'User',
          },
        },
      });
      
      return { data, error };
    } catch (error) {
      console.error('Error signing up:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Unknown error during signup') 
      };
    }
  }

  /**
   * Sign in a user with email and password
   */
  static async signIn(email: string, password: string) {
    const supabase = this.createClient();
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      return { data, error };
    } catch (error) {
      console.error('Error signing in:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Unknown error during sign in') 
      };
    }
  }

  /**
   * Sign in with OAuth provider
   */
  static async signInWithOAuth(provider: 'google' | 'github') {
    const supabase = this.createClient();
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      });
      
      return { data, error };
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error(`Unknown error during ${provider} sign in`) 
      };
    }
  }

  /**
   * Sign out a user
   */
  static async signOut() {
    const supabase = this.createClient();
    
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('Error signing out:', error);
      return { 
        error: error instanceof Error ? error : new Error('Unknown error during sign out') 
      };
    }
  }

  /**
   * Exchange an auth code for a session
   */
  static async exchangeCodeForSession(code: string, cookieStore?: any) {
    const supabase = await this.createServerClient(cookieStore);
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      return { data, error };
    } catch (error) {
      console.error('Error exchanging code for session:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Unknown error exchanging code') 
      };
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(email: string) {
    const supabase = this.createClient();
    
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      return { data, error };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Unknown error during password reset') 
      };
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(password: string) {
    const supabase = this.createClient();
    
    try {
      const { data, error } = await supabase.auth.updateUser({
        password,
      });
      
      return { data, error };
    } catch (error) {
      console.error('Error updating password:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Unknown error updating password') 
      };
    }
  }
}

// Export for convenience
export const createClient = AuthService.createClient;
export const createServerClient = AuthService.createServerClient;
export const updateSession = AuthService.updateSession; 