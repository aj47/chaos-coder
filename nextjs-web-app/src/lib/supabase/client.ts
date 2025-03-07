import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const createClient = () => {
  // Explicitly use the environment variables to ensure they're properly loaded
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log("Creating Supabase client with:", { 
    supabaseUrl: supabaseUrl ? "Set" : "Not set", 
    supabaseKey: supabaseKey ? "Set" : "Not set" 
  });
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase environment variables are not set correctly!");
  }
  
  return createClientComponentClient({
    supabaseUrl,
    supabaseKey,
  });
}
