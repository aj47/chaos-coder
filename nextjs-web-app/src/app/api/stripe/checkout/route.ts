import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

// Simplified request type
interface CheckoutRequestBody {
  tier: 'pro' | 'ultra';
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  console.log(`🔄 [${requestId}] Starting checkout process`);
  
  try {
    // 1. Basic request validation
    const body = await req.json() as CheckoutRequestBody;
    const { tier } = body;
    
    if (!tier || !['pro', 'ultra'].includes(tier)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid tier specified' }), 
        { status: 400 }
      );
    }

    // 2. Get authenticated user using server-side client with cookies
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user?.id || !user?.email) {
      console.error(`❌ [${requestId}] Auth error:`, userError);
      return new NextResponse(
        JSON.stringify({ error: 'Not authenticated' }), 
        { status: 401 }
      );
    }

    // 3. Get or create profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    
    if (profileError?.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { error: createError } = await supabase
        .from('profiles')
        .insert([{ id: user.id }])
        .single();
      
      if (createError) {
        console.error(`❌ [${requestId}] Profile creation error:`, createError);
        return new NextResponse(
          JSON.stringify({ error: 'Failed to create profile' }), 
          { status: 500 }
        );
      }
    } else if (profileError) {
      console.error(`❌ [${requestId}] Profile error:`, profileError);
      return new NextResponse(
        JSON.stringify({ error: 'Failed to get profile' }), 
        { status: 500 }
      );
    }

    // 4. Get or create Stripe customer
    let stripeCustomerId = profile?.stripe_customer_id;
    
    if (!stripeCustomerId) {
      stripeCustomerId = await PaymentService.createOrRetrieveCustomer(user.email, user.id);
      
      // Update profile with new customer ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);
      
      if (updateError) {
        console.error(`❌ [${requestId}] Failed to update stripe_customer_id:`, updateError);
      }
    }

    // 5. Create checkout session
    const { url } = await PaymentService.createSubscriptionCheckout(
      stripeCustomerId,
      tier,
      user.id
    );

    if (!url) {
      return new NextResponse(
        JSON.stringify({ error: 'Failed to create checkout session' }), 
        { status: 500 }
      );
    }

    return new NextResponse(
      JSON.stringify({ url }), 
      { status: 200 }
    );
    
  } catch (error) {
    console.error(`❌ [${requestId}] Checkout error:`, error);
    return new NextResponse(
      JSON.stringify({ 
        error: `Checkout failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }), 
      { status: 500 }
    );
  }
} 