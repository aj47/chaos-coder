import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function GET() {
  try {
    // Create a Supabase client
    const supabase = createServerComponentClient<Database>({ cookies });
    
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    console.log("[DEBUG] Getting profile for user:", session.user.id);
    
    // Try to get the profile directly
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (error) {
      console.error("[DEBUG] Error fetching profile:", error);
      
      // Try to create a profile
      console.log("[DEBUG] Attempting to create profile");
      
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
        console.error("[DEBUG] Error creating profile:", insertError);
        
        // Return default profile data if we can't create one
        return NextResponse.json({
          profile: {
            id: session.user.id,
            credits: 25,
            subscription_tier: 'free',
            first_name: session.user.user_metadata?.first_name || 'User'
          }
        });
      }
      
      return NextResponse.json({ profile: newProfile });
    }
    
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
} 