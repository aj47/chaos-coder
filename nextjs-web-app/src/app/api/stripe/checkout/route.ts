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

    let customerId = profile?.stripe_customer_id;
    let needsUpdate = false;

    // If no Stripe customer ID exists or if we encounter an error with the existing customer ID,
    // create a new customer
    try {
      // Create a checkout session to test if the customer ID is valid
      if (customerId) {
        const { url } = await createCheckoutSession(
          customerId,
          planDetails.priceId as string,
          user.id
        );
        
        return NextResponse.json({ url });
      }
    } catch (error) {
      console.error('Error with existing customer ID, creating a new one:', error);
      customerId = null;
      needsUpdate = true;
    }

    // If we reach here, either there was no customer ID or the existing one was invalid
    if (!customerId) {
      customerId = await createOrRetrieveCustomer(user.email || '', user.id);
      needsUpdate = true;
    }

    // Update the user's profile with the new Stripe customer ID if needed
    if (needsUpdate) {
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

    // Create a checkout session with the valid customer ID
    const { url } = await createCheckoutSession(
      customerId,
      planDetails.priceId as string,
      user.id
    );

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error in checkout API:', error);
    return NextResponse.json(
      { error: `Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 