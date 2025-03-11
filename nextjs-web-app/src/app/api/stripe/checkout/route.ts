import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment';
import { AuthService } from '@/lib/auth';
import { CookieOptions } from '@supabase/ssr';

// Simplified request type
interface CheckoutRequestBody {
  tier: 'pro' | 'ultra';
  accessToken: string;
  userId: string;
  userEmail: string;
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  console.log(`🔄 [${requestId}] Starting checkout process`);
  
  try {
    // 1. Basic request validation
    const body = await req.json() as CheckoutRequestBody;
    const { tier, accessToken, userId, userEmail } = body;
    
    if (!tier || !['pro', 'ultra'].includes(tier)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid tier specified' }), 
        { status: 400 }
      );
    }

    if (!accessToken || !userId || !userEmail) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing authentication data' }), 
        { status: 400 }
      );
    }

    // 2. Create Supabase client with auth token
    const supabase = await AuthService.createServerClientWithToken(accessToken);
    console.log(`🔄 [${requestId}] Created Supabase client`);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log(`👤 [${requestId}] Auth check result - User:`, user?.id, 'Error:', userError?.message);
    
    if (userError || !user?.id || user.id !== userId) {
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
    
    if (profileError) {
      if (profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log(`🔄 [${requestId}] Profile not found, creating new profile for user ${user.id}`);
        
        const { error: createError } = await supabase
          .from('profiles')
          .insert({ id: user.id });
        
        if (createError) {
          console.error(`❌ [${requestId}] Profile creation error:`, createError);
          return new NextResponse(
            JSON.stringify({ error: 'Failed to create profile' }), 
            { status: 500 }
          );
        }
        
        console.log(`✅ [${requestId}] Created new profile for user ${user.id}`);
      } else {
        console.error(`❌ [${requestId}] Profile error:`, profileError);
        return new NextResponse(
          JSON.stringify({ error: 'Failed to get profile' }), 
          { status: 500 }
        );
      }
    }

    // 4. Get or create Stripe customer
    let stripeCustomerId = profile?.stripe_customer_id;
    
    if (!stripeCustomerId) {
      console.log(`🔄 [${requestId}] No Stripe customer ID found, creating new customer`);
      
      stripeCustomerId = await PaymentService.createOrRetrieveCustomer(userEmail, userId);
      
      // Update profile with new customer ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);
      
      if (updateError) {
        console.error(`❌ [${requestId}] Failed to update stripe_customer_id:`, updateError);
      } else {
        console.log(`✅ [${requestId}] Updated profile with new Stripe customer ID: ${stripeCustomerId}`);
      }
    } else {
      console.log(`✅ [${requestId}] Using existing Stripe customer ID: ${stripeCustomerId}`);
    }

    // 5. Create checkout session
    console.log(`🔄 Creating subscription checkout for customer ${stripeCustomerId}, tier: ${tier}`);
    
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

    console.log(`✅ [${requestId}] Created checkout session with URL: ${url.substring(0, 50)}...`);
    
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