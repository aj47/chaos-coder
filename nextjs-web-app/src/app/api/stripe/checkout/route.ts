import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment';
import { AuthService } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from "@/types/supabase";

// Define a type for the user object
interface UserData {
  id: string;
  email: string;
}

// Define the request body type
interface CheckoutRequestBody {
  tier: 'pro' | 'ultra';
  accessToken?: string;
  userId?: string;
  userEmail?: string;
  userAuthTime?: string;
}

// Add OPTIONS method handler for CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Origin',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function POST(req: NextRequest) {
  console.log(`🔄 Starting checkout process`);
  
  try {
    // Get the origin for CORS
    const origin = req.headers.get('origin') || '*';
    
    // Set CORS headers for the actual response
    const headers = new Headers({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
    });
    
    // Log all request headers for debugging
    const reqHeaders = Object.fromEntries(req.headers.entries());
    console.log(`📊 Request headers:`, JSON.stringify(reqHeaders, null, 2));
    
    // Parse the request body first to get potential access token
    const body = await req.json() as CheckoutRequestBody;
    const { tier, accessToken: bodyToken, userId, userEmail, userAuthTime } = body;
    
    if (!tier || !['pro', 'ultra'].includes(tier)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid tier specified' }), 
        { status: 400, headers }
      );
    }
    
    console.log(`🔄 Processing checkout for tier: ${tier}`);
    console.log(`📊 Access token in body: ${bodyToken ? `Present (length: ${bodyToken.length})` : 'Not present'}`);
    console.log(`📊 User ID in body: ${userId || 'Not present'}`);
    console.log(`📊 User email: ${userEmail || 'Not present'}`);
    console.log(`📊 Last auth time: ${userAuthTime || 'Not present'}`);
    
    // Try to get the auth token from multiple sources
    const authToken = req.headers.get('authorization')?.replace('Bearer ', '') || bodyToken || '';
    
    if (!authToken) {
      console.error(`❌ No auth token found in any source`);
      return new NextResponse(
        JSON.stringify({ error: 'User not authenticated - No token found' }), 
        { status: 401, headers }
      );
    }
    
    console.log(`✅ Auth token extracted successfully (length: ${authToken.length}, first 10 chars: ${authToken.substring(0, 10)}...)`);
    
    // Try multiple authentication approaches
    
    // Approach 1: Use AuthService directly
    try {
      console.log(`🔄 Trying authentication with AuthService...`);
      const supabase = AuthService.createClient();
      
      // First try to get the user from the token
      const { data: { user }, error: userError } = await supabase.auth.getUser(authToken);
      
      if (userError) {
        console.error(`❌ Failed to get user from token:`, userError);
        throw userError;
      }
      
      if (!user || !user.email) {
        console.error(`❌ No user or email found for token`);
        throw new Error('Invalid user data');
      }
      
      console.log(`✅ User authenticated:`, { 
        id: user.id, 
        email: user.email,
        providedUserId: userId
      });
      
      // Verify the user ID matches if provided
      if (userId && user.id !== userId) {
        console.error(`❌ User ID mismatch: Token user ${user.id} != Provided user ${userId}`);
        throw new Error('User ID mismatch');
      }
      
      // Verify the user exists in the database
      const { error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error(`❌ User profile not found:`, profileError);
        throw profileError;
      }
      
      console.log(`✅ User profile verified`);
      
      // If we get here, the user is authenticated
      console.log(`✅ Authentication successful for user ${user.id}`);
      
      // Continue with checkout using this user
      const userData: UserData = {
        id: user.id,
        email: user.email
      };
      
      return await processCheckout(userData, tier, supabase);
    } catch (error) {
      console.error(`❌ Authentication error:`, error);
      
      // Check if this is a token expiration error
      const isExpiredError = error instanceof Error && 
        (error.message.includes('expired') || error.message.includes('invalid'));
      
      return new NextResponse(
        JSON.stringify({ 
          error: `User not authenticated - ${isExpiredError ? 'Token expired' : 'Invalid token'}`,
          details: error instanceof Error ? error.message : 'Unknown error'
        }), 
        { status: 401, headers }
      );
    }
    
    // Approach 2: Create a client with the token directly
    try {
      console.log(`🔄 Trying direct token authentication...`);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables');
      }
      
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        },
        global: {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      });
      
      // Get the current user directly with the token
      const { data: { user }, error: userError } = await supabase.auth.getUser(authToken);
      
      if (userError) {
        console.error(`❌ Direct token error:`, userError);
      } else if (user) {
        console.log(`✅ User authenticated via direct token: ${user.id}`);
        
        // Continue with checkout using this user
        return await processCheckout(user as UserData, tier, supabase);
      }
    } catch (directTokenError) {
      console.error(`❌ Direct token approach failed:`, directTokenError);
    }
    
    // Approach 3: Use service role as a last resort with userId from the request body
    if (userId) {
      try {
        console.log(`🔄 Trying service role authentication with provided userId: ${userId}`);
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !serviceRoleKey) {
          throw new Error('Missing Supabase environment variables');
        }
        
        console.log(`📊 Supabase URL: ${supabaseUrl}`);
        console.log(`📊 Service role key available: ${!!serviceRoleKey}`);
        
        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });
        
        // Get the user directly from the database using provided userId
        const { data: userData, error: userDataError } = await adminClient
          .from('profiles')
          .select('id, email')
          .eq('id', userId)
          .single();
          
        if (userDataError) {
          console.error(`❌ Error getting user data:`, userDataError);
        } else if (userData) {
          console.log(`✅ Found user in database using provided userId: ${userData.id}`);
          
          // Create a user object that matches the structure expected by processCheckout
          const user: UserData = {
            id: userData.id,
            email: userData.email
          };
          
          // Continue with checkout using this user
          return await processCheckout(user, tier, adminClient);
        }
      } catch (serviceRoleError) {
        console.error(`❌ Service role approach with userId failed:`, serviceRoleError);
      }
    }
    
    // Approach 4: Use service role with JWT parsing as before
    try {
      console.log(`🔄 Trying service role authentication with JWT parsing...`);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase environment variables');
      }
      
      console.log(`📊 Supabase URL: ${supabaseUrl}`);
      console.log(`📊 Service role key available: ${!!serviceRoleKey}`);
      
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      
      // Try to decode the JWT to get the user ID
      try {
        const decoded = JSON.parse(atob(authToken.split('.')[1]));
        const userId = decoded.sub;
        
        if (userId) {
          console.log(`✅ Extracted user ID from token: ${userId}`);
          
          // Get the user directly from the database
          const { data: userData, error: userDataError } = await adminClient
            .from('profiles')
            .select('id, email')
            .eq('id', userId)
            .single();
            
          if (userDataError) {
            console.error(`❌ Error getting user data:`, userDataError);
          } else if (userData) {
            console.log(`✅ Found user in database: ${userData.id}`);
            
            // Create a user object that matches the structure expected by processCheckout
            const user: UserData = {
              id: userData.id,
              email: userData.email
            };
            
            // Continue with checkout using this user
            return await processCheckout(user, tier, adminClient);
          }
        }
      } catch (decodeError) {
        console.error(`❌ Error decoding token:`, decodeError);
      }
    } catch (serviceRoleError) {
      console.error(`❌ Service role approach with JWT failed:`, serviceRoleError);
    }
    
    // If we get here, all authentication approaches failed
    console.error(`❌ All authentication approaches failed`);
    console.error(`📊 Auth debugging: 
      - Auth token first 20 chars: ${authToken?.substring(0, 20)}...
      - Auth token length: ${authToken?.length}
      - User ID from body: ${userId || 'Not present'}
      - User email: ${userEmail || 'Not present'}
      - Last auth time: ${userAuthTime || 'Not present'}
      - Request origin: ${origin}
      - Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'}
      - Anon key available: ${!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - Service role key available: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}
    `);
    return new NextResponse(
      JSON.stringify({ error: 'User not authenticated - Invalid token' }), 
      { status: 401, headers }
    );
  } catch (error) {
    console.error(`❌ Checkout error:`, error);
    return new NextResponse(
      JSON.stringify({ error: `Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}` }),
      { status: 500, headers: {
        'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
        'Access-Control-Allow-Credentials': 'true',
      }}
    );
  }
}

// Helper function to process the checkout once we have a valid user
async function processCheckout(user: UserData, tier: 'pro' | 'ultra', supabase: SupabaseClient) {
  console.log(`🔄 Processing checkout for user: ${user.id}, tier: ${tier}`);
  
  // Get the user's profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
    
  if (profileError) {
    console.error(`❌ Error getting profile:`, profileError);
    return NextResponse.json({ error: 'Failed to get user profile' }, { status: 500 });
  }
  
  console.log(`✅ User profile found: ${profile.id}`);
  console.log(`📊 Current subscription tier: ${profile.subscription_tier || 'free'}`);
  console.log(`📊 Current subscription status: ${profile.subscription_status || 'none'}`);
  
  // Check if the user already has a Stripe customer ID
  const customerId = profile.stripe_customer_id;
  console.log(`📊 Has Stripe customer ID: ${!!customerId}`);
  
  // Create or retrieve a Stripe customer
  let stripeCustomerId: string;
  
  if (customerId) {
    console.log(`🔄 Creating checkout session with existing customer ID: ${customerId}`);
    stripeCustomerId = customerId;
  } else {
    console.log(`🔄 Creating new Stripe customer for user: ${user.id}`);
    stripeCustomerId = await PaymentService.createOrRetrieveCustomer(user.email, user.id);
    
    console.log(`✅ New Stripe customer created: ${stripeCustomerId}`);
    
    // Update the user's profile with the Stripe customer ID
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id);
      
    if (updateError) {
      console.error(`❌ Error updating profile with Stripe customer ID:`, updateError);
    } else {
      console.log(`✅ Profile updated with Stripe customer ID`);
    }
  }
  
  // Create a checkout session
  const { url } = await PaymentService.createSubscriptionCheckout(
    stripeCustomerId,
    tier,
    user.id
  );
  
  if (!url) {
    console.error(`❌ Failed to create checkout session`);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
  
  console.log(`✅ Checkout session created, redirecting to: ${url ? 'Valid URL' : 'No URL'}`);
  console.log(`📊 Checkout details:
    - User ID: ${user.id}
    - Customer ID: ${stripeCustomerId}
    - Target tier: ${tier}
  `);
  
  return NextResponse.json({ url });
} 