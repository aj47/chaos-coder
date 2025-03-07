import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates and returns a Supabase client for use in server components and API routes
 * with proper error handling for environment variables and session persistence
 */
export const createServerClient = async (): Promise<SupabaseClient<Database>> => {
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
  
  const client = createSupabaseServerClient<Database>(
    supabaseUrl || '',
    supabaseKey || '',
    {
      cookies: {
        get: async (name: string) => {
          try {
            console.log(`[DEBUG] Server client getting cookie: ${name}`);
            const cookieStore = await cookies();
            const value = cookieStore.get(name)?.value;
            console.log(`[DEBUG] Cookie ${name} exists: ${!!value}`);
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
    const { data } = await client.auth.getSession();
    console.log("[DEBUG] Initial server client session check:", data.session ? `Session exists for user ${data.session.user.id}` : "No session found");
  } catch (error) {
    console.error("[DEBUG] Error checking initial server client session:", error);
  }
  
  return client;
}; 