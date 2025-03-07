import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cancelSubscription as cancelStripeSubscription } from '@/services/stripe';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function POST() {
  try {
    // Create a Supabase client with cookie access
    const supabase = createServerComponentClient<Database>({ cookies });
    
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Cancel the subscription
    await cancelStripeSubscription(session.user.id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
} 