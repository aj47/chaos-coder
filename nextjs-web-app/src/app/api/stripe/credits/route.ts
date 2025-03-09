import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createCreditsCheckoutSession } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const { amount } = body;

    // Validate the amount
    if (!amount || amount < 1) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Initialize Supabase client
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_tier')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    // Check if user has a paid plan
    if (!profile?.subscription_tier || profile.subscription_tier.toLowerCase() === 'free') {
      return NextResponse.json(
        { error: 'Credit purchases are only available for Pro and Ultra plans' },
        { status: 400 }
      );
    }

    const customerId = profile.stripe_customer_id;

    if (!customerId) {
      return NextResponse.json(
        { error: 'No Stripe customer ID found. Please contact support.' },
        { status: 400 }
      );
    }

    // Create a checkout session for credit purchase
    const { sessionId, url } = await createCreditsCheckoutSession(
      customerId,
      user.id,
      amount,
      profile.subscription_tier
    );

    return NextResponse.json({ sessionId, url });
  } catch (error) {
    console.error('Error in credits purchase API:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session for credits' },
      { status: 500 }
    );
  }
} 