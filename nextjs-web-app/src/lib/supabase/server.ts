import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates and returns a Supabase client for use in server components and API routes
 * with proper error handling for environment variables
 */
export const createServerClient = async (): Promise<SupabaseClient<Database>> => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase environment variables are not set correctly for server client!");
    
    // In development, provide more helpful error messages
    if (process.env.NODE_ENV === 'development') {
      console.error(`
        Please ensure you have the following in your .env file:
        NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
        NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
      `);
    }
  }
  
  return createSupabaseServerClient<Database>(
    supabaseUrl || '',
    supabaseKey || '',
    {
      cookies: {
        get: async (name: string) => {
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value;
        },
        set: (_name: string, _value: string, _options: object) => {
          // This is handled by the middleware
        },
        remove: (_name: string, _options: object) => {
          // This is handled by the middleware
        },
      },
    }
  );
}; 