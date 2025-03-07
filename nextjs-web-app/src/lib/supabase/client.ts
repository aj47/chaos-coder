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
    console.error("Supabase environment variables are not set correctly!");
    
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
      const { data } = await client.auth.getSession();
      console.log("[DEBUG] Initial session check:", data.session ? `Session exists for user ${data.session.user.id}` : "No session found");
      
      // Log all cookies to see if auth cookie exists
      console.log("[DEBUG] Current cookies:", document.cookie);
    } catch (error) {
      console.error("[DEBUG] Error checking initial session:", error);
    }
  }, 100);
  
  return client;
}
