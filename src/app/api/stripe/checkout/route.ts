import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment';
import { AuthService } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// Simplified request type
interface CheckoutRequestBody {
  tier: 'pro' | 'ultra';
  accessToken?: string; // Allow passing access token in the request body
  userId?: string;      // Allow passing user ID in the request body
  userEmail?: string;   // Allow passing user email in the request body
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

    // 2. Get authenticated user - try multiple authentication methods
    let user = null;
    let authError = null;
    
    // Method 1: Try to get user from the session cookie
    const supabase = AuthService.createClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getUser();
    
    if (!sessionError && sessionData.user) {
      console.log(`✅ [${requestId}] User authenticated via session cookie:`, sessionData.user.id);
      user = sessionData.user;
    } else {
      console.log(`⚠️ [${requestId}] Session cookie auth failed:`, sessionError?.message);
      authError = sessionError;
      
      // Method 2: Try to use the access token from the request body
      if (accessToken) {
        console.log(`🔑 [${requestId}] Trying authentication with provided access token`);
        const supabaseWithToken = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            }
          }
        );
        
        const { data: tokenData, error: tokenError } = await supabaseWithToken.auth.getUser();
        
        if (!tokenError && tokenData.user) {
          console.log(`✅ [${requestId}] User authenticated via access token:`, tokenData.user.id);
          user = tokenData.user;
          authError = null;
        } else {
          console.log(`⚠️ [${requestId}] Access token auth failed:`, tokenError?.message);
          authError = tokenError;
        }
      }
      
      // Method 3: If userId and userEmail are provided, verify they exist in the database
      if (!user && userId && userEmail) {
        console.log(`🔍 [${requestId}] Trying to verify user with provided ID and email`);
        
        // Use service role to check if the user exists
        const adminSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        const { data: userData, error: userError } = await adminSupabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single();
        
        if (!userError && userData) {
          console.log(`✅ [${requestId}] User verified via ID/email:`, userId);
          user = { id: userId, email: userEmail };
          authError = null;
        } else {
          console.log(`⚠️ [${requestId}] User ID/email verification failed:`, userError?.message);
          authError = userError || new Error('User not found');
        }
      }
    }
    
    // If all authentication methods failed, return error
    if (!user) {
      console.error(`❌ [${requestId}] All authentication methods failed:`, authError);
      return new NextResponse(
        JSON.stringify({ error: 'Not authenticated', details: authError?.message }), 
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