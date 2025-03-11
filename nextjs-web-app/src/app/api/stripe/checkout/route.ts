import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/auth';
import { PaymentService, PlanTierSchema } from '@/lib/payment';

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const { tier } = body;

    // Validate the tier
    const result = PlanTierSchema.safeParse(tier);
    if (!result.success || result.data === 'free') {
      return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 });
    }

    // Use our auth service to get the authenticated user
    const cookieStore = cookies();
    const supabase = await AuthService.createServerClient(cookieStore);
    const { user, error: userError } = await AuthService.getCurrentUser(supabase);

    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_tier, email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    let customerId = profile.stripe_customer_id;
    let needsUpdate = false;

    // If no Stripe customer ID exists or if we encounter an error with the existing customer ID,
    // create a new customer
    try {
      // Create a checkout session to test if the customer ID is valid
      if (customerId) {
        const { url } = await PaymentService.createSubscriptionCheckout(
          customerId,
          result.data,
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
      // Get a valid email address - first try profile email, then user email, then error
      const email = profile?.email || user.email;
      
      if (!email || !email.includes('@')) {
        return NextResponse.json(
          { error: 'Valid email address required for checkout. Please update your profile.' },
          { status: 400 }
        );
      }
      
      customerId = await PaymentService.createOrRetrieveCustomer(email, user.id);
      needsUpdate = true;
    }

    // Update the user's profile with the new Stripe customer ID if needed
    if (needsUpdate) {
      try {
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
      } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json(
          { error: 'Failed to update profile with Stripe customer ID' },
          { status: 500 }
        );
      }
    }

    // Create a checkout session with the valid customer ID
    const { url } = await PaymentService.createSubscriptionCheckout(
      customerId,
      result.data,
      user.id
    );

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred during checkout' },
      { status: 500 }
    );
  }
} 