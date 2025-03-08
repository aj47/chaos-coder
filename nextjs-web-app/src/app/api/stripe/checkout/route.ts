import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createCheckoutSession, createOrRetrieveCustomer, PLANS } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const { plan } = body;

    // Get plan details
    const planDetails = plan === 'PRO' ? PLANS.PRO : plan === 'ULTRA' ? PLANS.ULTRA : null;

    if (!planDetails || !planDetails.priceId) {
      return NextResponse.json({ error: 'Invalid plan or price ID not configured' }, { status: 400 });
    }

    // Initialize Supabase client
    const cookieStore = await cookies();
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

    let customerId = profile?.stripe_customer_id;

    // If no Stripe customer ID exists, create one
    if (!customerId) {
      customerId = await createOrRetrieveCustomer(user.email || '', user.id);

      // Update the user's profile with the Stripe customer ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile with Stripe customer ID:', updateError);
        return NextResponse.json(
          { error: 'Failed to update profile with Stripe customer ID' },
          { status: 500 }
        );
      }
    }

    // Create a checkout session
    const { sessionId, url } = await createCheckoutSession(
      customerId,
      planDetails.priceId as string,
      user.id
    );

    return NextResponse.json({ sessionId, url });
  } catch (error) {
    console.error('Error in checkout API:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 