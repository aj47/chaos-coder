import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createServerClient as createServerClientSSR, CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

interface CookieStore {
  get(name: string): { value: string } | undefined;
  set(options: { name: string; value: string } & CookieOptions): void;
  delete(options: { name: string } & CookieOptions): void;
}

type SupabaseClientType = SupabaseClient<Database>;

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
   */
  static async createServerClient(cookieStore?: CookieStore): Promise<SupabaseClientType> {
    console.log('AuthService: Creating server client with cookie store:', !!cookieStore);
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl) {
      console.error("AuthService: Supabase environment variables are not set correctly for server client!");
      throw new Error("Missing Supabase configuration");
    }
    
    // If we have a valid cookieStore, use it
    if (cookieStore) {
      console.log('AuthService: Using cookie store for server client');
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseKey) {
        throw new Error("Missing Supabase anon key");
      }
      
      return createServerClientSSR<Database>(
        supabaseUrl,
        supabaseKey,
        {
          cookies: {
            get(name: string): string {
              const cookie = cookieStore?.get(name);
              if (!cookie?.value) return '';
              
              // For auth token cookies, they're stored in a JSON array format
              if (name.includes('-auth-token')) {
                try {
                  // Only try to parse if it starts with a bracket (JSON array)
                  if (cookie.value.startsWith('[')) {
                    const parsed = JSON.parse(cookie.value);
                    return Array.isArray(parsed) ? parsed[0] : cookie.value;
                  }
                  // If it's already a JWT token (starts with ey), return as is
                  if (cookie.value.startsWith('ey')) {
                    return cookie.value;
                  }
                } catch (error) {
                  console.warn('AuthService: Cookie parse error:', error);
                  return cookie.value;
                }
              }
              
              return cookie.value;
            },
            set(name: string, value: string, options: CookieOptions): void {
              try {
                cookieStore?.set({ name, value, ...options });
              } catch (error) {
                console.warn('AuthService: Could not set cookie:', error);
              }
            },
            remove(name: string, options: CookieOptions): void {
              try {
                cookieStore?.delete({ name, ...options });
              } catch (error) {
                console.warn('AuthService: Could not remove cookie:', error);
              }
            }
          }
        }
      );
    }
    
    // Use service role key for webhook handlers and background processes
    // This is required for operations that need to bypass RLS
    console.log('AuthService: Using service role client (no cookie store)');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error("AuthService: Missing service role key, falling back to anon client");
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseKey) {
        throw new Error("Missing Supabase keys");
      }
      
      return createServerClientSSR<Database>(
        supabaseUrl,
        supabaseKey,
        {
          cookies: {
            get: () => '',
            set: () => {},
            remove: () => {}
          }
        }
      );
    }
    
    return createServerClientSSR<Database>(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false
        },
        cookies: {
          get: () => '',
          set: () => {},
          remove: () => {}
        }
      }
    );
  }

  /**
   * Create a Supabase client for middleware
   */
  static createMiddlewareClient(request: NextRequest) {
    return createServerClientSSR<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string): string {
            return request.cookies.get(name)?.value ?? '';
          },
          set(name: string, value: string, options: CookieOptions): void {
            // This is handled in the middleware
          },
          remove(name: string, options: CookieOptions): void {
            // This is handled in the middleware  
          }
        }
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
  static async getCurrentUser(supabase: SupabaseClientType) {
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
  static async verifyUserProfile(supabase: SupabaseClientType, userId: string) {
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
        // No longer storing first_name as per updated schema
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
  static async exchangeCodeForSession(code: string, cookieStore?: CookieStore) {
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

  /**
   * Create a server-side Supabase client using an access token
   */
  static async createServerClientWithToken(accessToken: string): Promise<SupabaseClientType> {
    console.log('AuthService: Creating server client with access token');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("AuthService: Supabase environment variables are not set correctly for server client!");
      throw new Error("Missing Supabase configuration");
    }
    
    const supabase = createServerClientSSR<Database>(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        },
        cookies: {
          get: () => '',
          set: () => {},
          remove: () => {}
        }
      }
    );

    return supabase;
  }
}

// Export for convenience
export const createClient = AuthService.createClient;
export const createServerClient = AuthService.createServerClient;
export const updateSession = AuthService.updateSession; 