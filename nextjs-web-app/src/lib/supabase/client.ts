import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

/**
 * Creates and returns a Supabase client for use in client components
 * with proper error handling for environment variables and session persistence
 */
export const createClient = () => {
  // Explicitly use the environment variables to ensure they're properly loaded
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("[DEBUG] Supabase environment variables are not set correctly!");
    
    // In development, provide more helpful error messages
    if (process.env.NODE_ENV === 'development') {
      console.error(`
        Please ensure you have the following in your .env file:
        NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
        NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
      `);
    }
  }
  
  console.log("[DEBUG] Creating Supabase client with URL:", supabaseUrl?.substring(0, 15) + "...");
  
  // Return typed client for better type safety with proper cookie persistence
  const client = createClientComponentClient<Database>({
    supabaseUrl: supabaseUrl || '',
    supabaseKey: supabaseKey || '',
  });
  
  // Debug: Check if we can get the session immediately after creating the client
  setTimeout(async () => {
    try {
      console.log("[DEBUG] Checking initial session after client creation");
      
      // Check if auth cookie exists directly
      const hasAuthCookie = document.cookie.includes('sb-xskelhjnymrbogeloxfy-auth-token');
      console.log("[DEBUG] Auth cookie exists in initial check:", hasAuthCookie);
      
      // Get the current session
      const { data, error } = await client.auth.getSession();
      
      if (error) {
        console.error("[DEBUG] Error in initial session check:", error.message);
      }
      
      console.log("[DEBUG] Initial session check:", data.session ? `Session exists for user ${data.session.user.id}` : "No session found");
      
      if (data.session) {
        console.log("[DEBUG] Initial session expires at:", new Date(data.session.expires_at! * 1000).toISOString());
        console.log("[DEBUG] Initial session access token (first 10 chars):", 
                   data.session.access_token.substring(0, 10) + "...");
      }
      
      // Log all cookies to see if auth cookie exists
      console.log("[DEBUG] Current cookies:", document.cookie);
      
      // Check for cookie-session mismatch
      if (hasAuthCookie && !data.session) {
        console.warn("[DEBUG] Cookie exists but no session - potential auth issue");
      } else if (!hasAuthCookie && data.session) {
        console.warn("[DEBUG] Session exists but no cookie - potential persistence issue");
      }
    } catch (error) {
      console.error("[DEBUG] Error checking initial session:", error);
      console.error("[DEBUG] Error details:", error instanceof Error ? error.message : String(error));
    }
  }, 100);
  
  return client;
}
