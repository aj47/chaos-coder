import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates and returns a Supabase client for use in server components and API routes
 * with proper error handling for environment variables and session persistence
 * 
 * Note: This function should only be used in App Router server components.
 * For Pages Router, use the client.ts version instead.
 */
export const createServerClient = async (
  cookieGetter: (name: string) => Promise<string | undefined> | string | undefined
): Promise<SupabaseClient<Database>> => {
  console.log("[DEBUG] Creating server client");
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("[DEBUG] Supabase environment variables are not set correctly for server client!");
    
    // In development, provide more helpful error messages
    if (process.env.NODE_ENV === 'development') {
      console.error(`
        Please ensure you have the following in your .env file:
        NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
        NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
      `);
    }
  }
  
  // Create a server client with proper cookie handling
  console.log("[DEBUG] Initializing server client with URL:", supabaseUrl?.substring(0, 15) + "...");
  
  // Track cookie access for debugging
  const cookieAccessLog: Record<string, boolean> = {};
  
  const client = createSupabaseServerClient<Database>(
    supabaseUrl || '',
    supabaseKey || '',
    {
      cookies: {
        get: async (name: string) => {
          try {
            console.log(`[DEBUG] Server client getting cookie: ${name}`);
            const value = await cookieGetter(name);
            const exists = !!value;
            console.log(`[DEBUG] Cookie ${name} exists: ${exists}`);
            
            // Track cookie access
            cookieAccessLog[name] = exists;
            
            // For auth token, log additional details (safely)
            if (name === 'sb-xskelhjnymrbogeloxfy-auth-token' && exists) {
              console.log(`[DEBUG] Auth token cookie length: ${value.length}`);
              
              try {
                // The cookie value might be URL-encoded, try to decode it
                const decodedValue = decodeURIComponent(value);
                console.log(`[DEBUG] Auth token cookie decoded length: ${decodedValue.length}`);
                console.log(`[DEBUG] Auth token cookie format valid: ${decodedValue.startsWith('[') && decodedValue.endsWith(']')}`);
                console.log(`[DEBUG] Auth token cookie first 20 chars: ${decodedValue.substring(0, 20)}`);
              } catch (decodeError) {
                console.error(`[DEBUG] Error decoding auth token cookie:`, decodeError);
                console.log(`[DEBUG] Auth token cookie format valid (raw): ${value.startsWith('[') && value.endsWith(']')}`);
              }
            }
            
            return value;
          } catch (error) {
            console.error(`[DEBUG] Error getting cookie ${name}:`, error);
            return undefined;
          }
        },
        set: () => {
          console.log("[DEBUG] Server client set cookie called - this is handled by middleware");
          // This is handled by the middleware
          // Server components cannot set cookies directly
        },
        remove: () => {
          console.log("[DEBUG] Server client remove cookie called - this is handled by middleware");
          // This is handled by the middleware
          // Server components cannot remove cookies directly
        },
      },
    }
  );
  
  // Debug: Check if we can get the session immediately after creating the client
  try {
    const { data, error } = await client.auth.getSession();
    
    if (error) {
      console.error("[DEBUG] Error in initial server client session check:", error.message);
    }
    
    console.log("[DEBUG] Initial server client session check:", data.session ? `Session exists for user ${data.session.user.id}` : "No session found");
    
    if (data.session) {
      console.log("[DEBUG] Server session expires at:", new Date(data.session.expires_at! * 1000).toISOString());
    }
    
    // Log cookie access summary
    console.log("[DEBUG] Cookie access summary:", cookieAccessLog);
    
    // Check for potential issues
    if (!cookieAccessLog['sb-xskelhjnymrbogeloxfy-auth-token'] && data.session) {
      console.warn("[DEBUG] Session exists but auth cookie wasn't accessed - potential issue");
    } else if (cookieAccessLog['sb-xskelhjnymrbogeloxfy-auth-token'] && !data.session) {
      console.warn("[DEBUG] Auth cookie was accessed but no session found - potential auth issue");
    }
  } catch (error) {
    console.error("[DEBUG] Error checking initial server client session:", error);
    console.error("[DEBUG] Error details:", error instanceof Error ? error.message : String(error));
  }
  
  return client;
}; 