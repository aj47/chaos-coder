import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function POST() {
  try {
    // Create a Supabase client
    const supabase = createServerComponentClient<Database>({ cookies });
    
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    console.log("[DEBUG] Creating profile for user:", session.user.id);
    console.log("[DEBUG] User ID type:", typeof session.user.id);
    
    // First, check if the profiles table exists and has the correct schema
    const { error: tableError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error("[DEBUG] Error checking profiles table:", tableError);
      return NextResponse.json({ 
        error: 'Error checking profiles table: ' + tableError.message,
        details: tableError
      }, { status: 500 });
    }
    
    // Check if profile already exists
    const { data: existingProfile, error: queryError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .single();
    
    if (queryError && !queryError.message.includes('No rows found')) {
      console.error("[DEBUG] Error checking existing profile:", queryError);
      return NextResponse.json({ 
        error: 'Error checking existing profile: ' + queryError.message,
        details: queryError
      }, { status: 500 });
    }
    
    if (existingProfile) {
      return NextResponse.json({ 
        message: 'Profile already exists',
        userId: session.user.id,
        profileId: existingProfile.id
      });
    }
    
    // Try direct insert since RPC might not be available
    console.log("[DEBUG] Attempting direct insert");
    
    const { data: insertData, error: insertError } = await supabase
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
      console.error("[DEBUG] Error with insert:", insertError);
      return NextResponse.json({ 
        error: 'Failed to create profile: ' + insertError.message,
        details: insertError
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Profile created successfully',
      profile: insertData
    });
  } catch (error) {
    console.error('Error creating profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
} 