import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    // Initialize Supabase client with service role key for more permissions
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase environment variables' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if subscription_tier column exists by trying to query it
    const { error: tierError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .limit(1);
    
    let tierAdded = false;
    if (tierError && tierError.code === '42703') {
      // Add the subscription_tier column using a direct SQL query
      const { error: alterError } = await supabase
        .from('profiles')
        .update({ subscription_tier: 'free' })
        .eq('id', 'dummy-id');
      
      if (alterError && alterError.code === '42703') {
        // Column doesn't exist, try to add it
        const { data, error: sqlError } = await supabase
          .rpc('exec_sql', {
            query: `
              ALTER TABLE public.profiles 
              ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' NOT NULL;
            `
          });
        
        if (sqlError) {
          return NextResponse.json(
            { error: 'Failed to add subscription_tier column', details: sqlError },
            { status: 500 }
          );
        }
        
        tierAdded = true;
      }
    }
    
    // Check if subscription_status column exists by trying to query it
    const { error: statusError } = await supabase
      .from('profiles')
      .select('subscription_status')
      .limit(1);
    
    let statusAdded = false;
    if (statusError && statusError.code === '42703') {
      // Add the subscription_status column using a direct SQL query
      const { error: alterError } = await supabase
        .from('profiles')
        .update({ subscription_status: null })
        .eq('id', 'dummy-id');
      
      if (alterError && alterError.code === '42703') {
        // Column doesn't exist, try to add it
        const { data, error: sqlError } = await supabase
          .rpc('exec_sql', {
            query: `
              ALTER TABLE public.profiles 
              ADD COLUMN IF NOT EXISTS subscription_status TEXT;
            `
          });
        
        if (sqlError) {
          return NextResponse.json(
            { error: 'Failed to add subscription_status column', details: sqlError },
            { status: 500 }
          );
        }
        
        statusAdded = true;
      }
    }
    
    // Verify the changes by querying the profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profileError) {
      return NextResponse.json(
        { error: 'Error verifying changes', details: profileError },
        { status: 500 }
      );
    }
    
    // Get the current structure
    let structure = {};
    if (profileData && profileData.length > 0) {
      structure = Object.keys(profileData[0]).reduce((acc, column) => {
        acc[column] = typeof profileData[0][column];
        return acc;
      }, {});
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database schema checked and fixed',
      changes: {
        subscription_tier_added: tierAdded,
        subscription_status_added: statusAdded
      },
      structure
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 