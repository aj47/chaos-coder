import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { PaymentService, PlanTierSchema } from '@/lib/payment';

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  console.log(`🔄 [${requestId}] Starting credit purchase process`);
  
  try {
    // Parse the request body
    const body = await req.json();
    const { amount, accessToken } = body;

    // Validate the amount
    if (!amount || amount < 1) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Validate if access token was provided
    if (!accessToken) {
      console.error(`❌ [${requestId}] No access token provided`);
      return NextResponse.json({ error: 'Access token is required' }, { status: 401 });
    }
    
    // Use token-based authentication
    console.log(`🔄 [${requestId}] Using token-based authentication`);
    const supabase = await AuthService.createServerClientWithToken(accessToken);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error(`❌ [${requestId}] Auth error:`, userError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    console.log(`✅ [${requestId}] User authenticated: ${user.id}`);
    
    // Get user profile - remove 'email' from query as it doesn't exist in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_tier')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error(`❌ [${requestId}] Profile error:`, profileError);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    // Check if user has a paid plan
    if (!profile.subscription_tier || profile.subscription_tier.toLowerCase() === 'free') {
      return NextResponse.json(
        { error: 'Credit purchases are only available for Pro and Ultra plans' },
        { status: 400 }
      );
    }

    // Validate the tier
    const tierResult = PlanTierSchema.safeParse(profile.subscription_tier.toLowerCase());
    if (!tierResult.success) {
      return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 });
    }

    let customerId = profile.stripe_customer_id;
    let needsUpdate = false;

    // If no Stripe customer ID exists, create a new customer
    if (!customerId) {
      // Get email directly from auth user object, not from profile
      const email = user.email;
      
      if (!email || !email.includes('@')) {
        return NextResponse.json(
          { error: 'Valid email address required for checkout. Please update your profile.' },
          { status: 400 }
        );
      }
      
      // Use the method directly from PaymentService with correct parameter order
      customerId = await PaymentService.getOrCreateCustomer(user.id, email);
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
          console.error(`❌ [${requestId}] Error updating profile:`, updateError);
          return NextResponse.json(
            { error: 'Failed to update profile with Stripe customer ID' },
            { status: 500 }
          );
        }
      } catch (error) {
        console.error(`❌ [${requestId}] Error updating profile:`, error);
        return NextResponse.json(
          { error: 'Failed to update profile with Stripe customer ID' },
          { status: 500 }
        );
      }
    }

    // Create a checkout session for credit purchase with the valid customer ID
    console.log(`🔄 [${requestId}] Creating credit purchase checkout for ${amount} credits`);
    const { url } = await PaymentService.createCreditPurchaseCheckout(
      customerId,
      amount,
      tierResult.data,
      user.id
    );

    console.log(`✅ [${requestId}] Checkout URL created: ${url?.substring(0, 50)}...`);
    return NextResponse.json({ url });
    
  } catch (error) {
    console.error('Credit purchase error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred during credit purchase' },
      { status: 500 }
    );
  }
} 