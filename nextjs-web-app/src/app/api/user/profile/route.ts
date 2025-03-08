import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { createClient as createServerClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  console.log("[DEBUG] API: /api/user/profile route handler started");
  
  try {
    // First try with server client
    console.log("[DEBUG] API: Creating Supabase client with server client");
    const supabase = await createServerClient();
    
    // Get the current user session
    console.log("[DEBUG] API: Fetching auth session");
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // If there's an error or no session, try with the authorization header
    if (sessionError || !session) {
      console.log("[DEBUG] API: No session from cookies, checking authorization header");
      
      // Check for authorization header
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log("[DEBUG] API: No valid authorization header found");
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }
      
      // Extract the token
      const token = authHeader.split(' ')[1];
      console.log("[DEBUG] API: Found authorization token");
      
      // Create a direct client with the token
      const directClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );
      
      // Get the session with the token
      const { data: { user } } = await directClient.auth.getUser();
      
      if (!user) {
        console.log("[DEBUG] API: No user found with provided token");
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }
      
      console.log("[DEBUG] API: Getting profile for user from token:", user.id);
      
      // Try to get the profile directly
      const { data: profile, error } = await directClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error("[DEBUG] API: Error fetching profile:", error);
        
        // Try to create a profile
        console.log("[DEBUG] API: Attempting to create profile");
        
        // Create a profile directly
        const { data: newProfile, error: insertError } = await directClient
          .from('profiles')
          .insert({
            id: user.id,
            first_name: user.user_metadata?.first_name || 'User',
            credits: 25,
            subscription_tier: 'free',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (insertError) {
          console.error("[DEBUG] API: Error creating profile:", insertError);
          
          // Return default profile data if we can't create one
          console.log("[DEBUG] API: Returning default profile data");
          return NextResponse.json({
            profile: {
              id: user.id,
              credits: 25,
              subscription_tier: 'free',
              first_name: user.user_metadata?.first_name || 'User'
            }
          });
        }
        
        console.log("[DEBUG] API: New profile created successfully");
        return NextResponse.json({ profile: newProfile });
      }
      
      console.log("[DEBUG] API: Existing profile found and returned");
      return NextResponse.json({ profile });
    }
    
    // Continue with the session from cookies
    console.log("[DEBUG] API: Getting profile for user:", session.user.id);
    console.log("[DEBUG] API: Session expires at:", new Date(session.expires_at! * 1000).toISOString());
    console.log("[DEBUG] API: User email:", session.user.email);
    console.log("[DEBUG] API: User metadata:", JSON.stringify(session.user.user_metadata));
    
    // Try to get the profile directly
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (error) {
      console.error("[DEBUG] API: Error fetching profile:", error);
      
      // Try to create a profile
      console.log("[DEBUG] API: Attempting to create profile");
      
      // Create a profile directly
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          first_name: session.user.user_metadata?.first_name || 'User',
          credits: 25,
          subscription_tier: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertError) {
        console.error("[DEBUG] API: Error creating profile:", insertError);
        
        // Return default profile data if we can't create one
        console.log("[DEBUG] API: Returning default profile data");
        return NextResponse.json({
          profile: {
            id: session.user.id,
            credits: 25,
            subscription_tier: 'free',
            first_name: session.user.user_metadata?.first_name || 'User'
          }
        });
      }
      
      console.log("[DEBUG] API: New profile created successfully");
      return NextResponse.json({ profile: newProfile });
    }
    
    console.log("[DEBUG] API: Existing profile found and returned");
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('[DEBUG] API: Unhandled error in user profile route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
} 