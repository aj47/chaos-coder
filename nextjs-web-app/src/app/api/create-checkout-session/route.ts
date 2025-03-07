import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createCheckoutSession } from '@/services/stripe';
import { SubscriptionTier } from '@/types/supabase';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const { planType } = body;
    
    if (!planType) {
      return NextResponse.json({ error: 'Missing planType' }, { status: 400 });
    }
    
    // Create a Supabase client with cookie access
    const supabase = createServerComponentClient<Database>({ cookies });
    
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Create a checkout session
    const { sessionId, url } = await createCheckoutSession(session.user.id, planType as SubscriptionTier);
    
    return NextResponse.json({ sessionId, url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
} 