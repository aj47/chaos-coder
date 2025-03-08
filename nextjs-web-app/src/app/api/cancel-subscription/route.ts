import { NextResponse } from 'next/server';
import { cancelSubscription as cancelStripeSubscription } from '@/services/stripe';
import { createClient as createServerClient } from '@/utils/supabase/server';

export async function POST() {
  try {
    // Create a Supabase client using the server client
    console.log("[DEBUG] API: Creating Supabase client with server client");
    const supabase = await createServerClient();
    
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