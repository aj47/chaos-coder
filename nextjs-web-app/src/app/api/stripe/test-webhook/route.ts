import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    console.log('Test webhook endpoint called');
    
    // Initialize Supabase client
    console.log('Initializing Supabase client');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: {
          persistSession: false,
        },
      }
    );
    
    // Get user ID from query parameter
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      console.log('No user ID provided');
      return NextResponse.json({ error: 'No user ID provided' }, { status: 400 });
    }
    
    console.log('User ID:', userId);
    
    // Check if user exists
    console.log('Checking if user exists');
    const { data: user, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('User found:', user);
    
    // Update user profile
    console.log('Updating user profile');
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_tier: 'test',
        subscription_status: 'active',
        credits: 999,
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
    
    console.log('Profile updated successfully');
    
    // Insert test subscription history
    console.log('Inserting test subscription history');
    const { error: historyError } = await supabaseAdmin
      .from('subscription_history')
      .insert({
        user_id: userId,
        subscription_tier: 'test',
        status: 'active',
        amount_paid: 0,
        currency: 'usd',
      });
    
    if (historyError) {
      console.error('Error recording subscription history:', historyError);
      return NextResponse.json({ error: 'Failed to record subscription history' }, { status: 500 });
    }
    
    console.log('Subscription history recorded successfully');
    
    return NextResponse.json({ success: true, message: 'Test webhook processed successfully' });
  } catch (error) {
    console.error('Error in test webhook:', error);
    return NextResponse.json({ error: 'Test webhook failed' }, { status: 500 });
  }
} 