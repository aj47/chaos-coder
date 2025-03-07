import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

/**
 * Creates and returns a Supabase client for use in client components
 * with proper error handling for environment variables
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
  
  // Return typed client for better type safety
  return createClientComponentClient<Database>({
    supabaseUrl: supabaseUrl || '',
    supabaseKey: supabaseKey || '',
  });
}
