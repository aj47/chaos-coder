import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment';
import { AuthService } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';

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

// Define the base user data interface
interface BaseUserData {
  id: string;
  email: string;
}

// Extend for additional properties in validation
interface UnvalidatedUserData extends BaseUserData {
  [key: string]: unknown;
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

// Update type guard with proper typing
function isValidUserData(data: UnvalidatedUserData | null): data is UserData {
  return (
    data !== null &&
    typeof data.id === 'string' &&
    typeof data.email === 'string' &&
    data.id.length > 0 &&
    data.email.length > 0
  );
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  console.log(`🔄 [${requestId}] Starting checkout process`);
  
  try {
    // Get the origin for CORS with type assertion
    const origin = req.headers.get('origin');
    const validOrigin = origin || 'http://localhost:3000';
    
    // Set CORS headers for the actual response
    const headers = new Headers({
      'Access-Control-Allow-Origin': validOrigin,
      'Access-Control-Allow-Credentials': 'true',
      'x-request-id': requestId
    });
    
    // Log all request headers for debugging
    const reqHeaders = Object.fromEntries(req.headers.entries());
    console.log(`📊 [${requestId}] Request headers:`, JSON.stringify(reqHeaders, null, 2));
    
    // Parse the request body first to get potential access token
    const body = await req.json() as CheckoutRequestBody;
    const { tier, accessToken: bodyToken, userId, userEmail, userAuthTime } = body;
    
    console.log(`📊 [${requestId}] Request validation:`, {
      hasTier: !!tier,
      isValidTier: ['pro', 'ultra'].includes(tier || ''),
      hasBodyToken: !!bodyToken,
      hasUserId: !!userId,
      hasUserEmail: !!userEmail,
      hasUserAuthTime: !!userAuthTime,
      requestOrigin: validOrigin
    });
    
    if (!tier || !['pro', 'ultra'].includes(tier)) {
      console.error(`❌ [${requestId}] Invalid tier specified:`, tier);
      return new NextResponse(
        JSON.stringify({ error: 'Invalid tier specified' }), 
        { status: 400, headers }
      );
    }
    
    // Try to get the auth token from multiple sources
    const authToken = req.headers.get('authorization')?.replace('Bearer ', '') || bodyToken || '';
    
    console.log(`📊 [${requestId}] Auth token sources:`, {
      headerToken: !!req.headers.get('authorization'),
      bodyToken: !!bodyToken,
      finalTokenLength: authToken.length,
      tokenStart: authToken ? `${authToken.substring(0, 10)}...` : 'none'
    });
    
    if (!authToken) {
      console.error(`❌ [${requestId}] No auth token found in any source`);
      return new NextResponse(
        JSON.stringify({ error: 'User not authenticated - No token found' }), 
        { status: 401, headers }
      );
    }
    
    // Try to decode the token to check its structure
    try {
      const [headerPart, payloadPart] = authToken.split('.');
      if (headerPart && payloadPart) {
        console.log(`🔍 [${requestId}] Token structure analysis:`, {
          hasHeaderPart: true,
          hasPayloadPart: true,
          decodedHeader: JSON.parse(atob(headerPart)),
          decodedPayload: JSON.parse(atob(payloadPart))
        });
      } else {
        console.log(`🔍 [${requestId}] Token structure analysis: Invalid token format`);
      }
    } catch (decodeError) {
      console.error(`❌ [${requestId}] Token decode error:`, decodeError);
    }
    
    // Try multiple authentication approaches
    
    // Approach 1: Use AuthService directly
    try {
      console.log(`🔄 [${requestId}] Trying authentication with AuthService...`);
      const supabase = AuthService.createClient();
      
      // Try to get the user from the token with type checking
      const { data: { user }, error: userError } = await supabase.auth.getUser(authToken);
      
      if (userError || !user || !user.email || !user.id) {
        console.error(`❌ [${requestId}] Failed to get user from token:`, {
          error: userError?.message,
          name: userError?.name,
          status: userError?.status,
          hasUser: !!user,
          hasEmail: !!user?.email,
          hasId: !!user?.id
        });
        throw new Error('Invalid user data');
      }
      
      const validatedUser: UserData = {
        id: user.id,
        email: user.email
      };
      
      // Now we know user data is valid
      console.log(`✅ [${requestId}] User authenticated:`, { 
        id: validatedUser.id, 
        email: validatedUser.email,
        providedUserId: userId,
        lastSignIn: user.last_sign_in_at || 'unknown',
        appMetadata: user.app_metadata || {},
        userMetadata: user.user_metadata || {}
      });
      
      // Verify the user exists in the database
      const { error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', validatedUser.id)
        .single();
      
      if (profileError) {
        console.log(`⚠️ [${requestId}] Profile not found, attempting to create:`, {
          userId: validatedUser.id,
          email: validatedUser.email
        });
        
        // Try to create the profile
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([
            {
              id: validatedUser.id,
              email: validatedUser.email,
              subscription_tier: 'free',
              credits: 30, // Default starting credits
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single();
        
        if (createError) {
          console.error(`❌ [${requestId}] Failed to create profile:`, {
            error: createError.message,
            code: createError.code,
            details: createError.details
          });
          return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500, headers });
        }
        
        console.log(`✅ [${requestId}] Profile created successfully:`, {
          id: newProfile.id,
          email: newProfile.email,
          tier: newProfile.subscription_tier
        });
      }
      
      return await processCheckout(validatedUser, tier, supabase, requestId, headers);
    } catch (error) {
      console.error(`❌ [${requestId}] Authentication error:`, {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error,
        authToken: authToken ? `${authToken.substring(0, 10)}...` : 'none'
      });
      
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
        
        // Create userData only after all validations pass
        const userData: UserData = {
          id: user.id,
          email: user.email
        };
        
        return await processCheckout(userData, tier, supabase, requestId, headers);
      }
    } catch (directTokenError) {
      // Try approach 3: Use service role to look up user
      try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
          throw new Error('Missing required environment variables');
        }

        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        );

        // Look up user by ID if provided
        if (userId) {
          const { data: userData, error: userError } = await adminClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          const validatedData = userData as UnvalidatedUserData;
          
          if (userError || !isValidUserData(validatedData)) {
            throw new Error('User not found or invalid data');
          }

          console.log(`✅ Found user in database using provided userId: ${validatedData.id}`);
          
          return await processCheckout(validatedData, tier, adminClient, requestId, headers);
        }

        // Try email lookup as last resort
        if (userEmail) {
          const { data: userData, error: userError } = await adminClient
            .from('profiles')
            .select('*')
            .eq('email', userEmail)
            .single();

          const validatedData = userData as UnvalidatedUserData;
          
          if (userError || !isValidUserData(validatedData)) {
            throw new Error('User not found or invalid data');
          }

          console.log(`✅ Found user in database: ${validatedData.id}`);
          
          return await processCheckout(validatedData, tier, adminClient, requestId, headers);
        }
      } catch (serviceRoleError) {
        console.error(`❌ [${requestId}] Service role authentication failed:`, serviceRoleError);
        throw serviceRoleError;
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
            
            // Create userData only after all validations pass
            const user: UserData = {
              id: userData.id,
              email: userData.email
            };
            
            // Continue with checkout using this user
            return await processCheckout(user, tier, adminClient, requestId, headers);
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
      - Request origin: ${validOrigin}
      - Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'}
      - Anon key available: ${!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - Service role key available: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}
    `);
    return new NextResponse(
      JSON.stringify({ error: 'User not authenticated - Invalid token' }), 
      { status: 401, headers }
    );
  } catch (error) {
    console.error(`❌ [${requestId}] Checkout error:`, {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : error
    });
    
    const origin = req.headers.get('origin');
    const fallbackOrigin = origin || 'http://localhost:3000';
    
    return new NextResponse(
      JSON.stringify({ error: `Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}` }),
      { 
        status: 500, 
        headers: {
          'Access-Control-Allow-Origin': fallbackOrigin,
          'Access-Control-Allow-Credentials': 'true',
          'x-request-id': requestId
        }
      }
    );
  }
}

// Helper function to process the checkout once we have a valid user
async function processCheckout(
  user: UserData, 
  tier: 'pro' | 'ultra', 
  supabase: SupabaseClient, 
  requestId: string,
  headers: Headers
) {
  console.log(`🔄 [${requestId}] Processing checkout for user: ${user.id}, tier: ${tier}`);
  
  // Get the user's profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
    
  if (profileError) {
    console.error(`❌ [${requestId}] Error getting profile:`, {
      error: profileError.message,
      code: profileError.code,
      details: profileError.details
    });
    return NextResponse.json({ error: 'Failed to get user profile' }, { status: 500, headers });
  }
  
  console.log(`✅ [${requestId}] User profile details:`, {
    id: profile.id,
    currentTier: profile.subscription_tier || 'free',
    status: profile.subscription_status || 'none',
    hasStripeCustomer: !!profile.stripe_customer_id
  });
  
  // Create or retrieve a Stripe customer
  let stripeCustomerId: string;
  
  if (profile.stripe_customer_id) {
    console.log(`🔄 [${requestId}] Using existing Stripe customer: ${profile.stripe_customer_id}`);
    stripeCustomerId = profile.stripe_customer_id;
  } else {
    console.log(`🔄 [${requestId}] Creating new Stripe customer for user: ${user.id}`);
    stripeCustomerId = await PaymentService.createOrRetrieveCustomer(user.email, user.id);
    
    console.log(`✅ [${requestId}] New Stripe customer created: ${stripeCustomerId}`);
    
    // Update the user's profile with the Stripe customer ID
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id);
      
    if (updateError) {
      console.error(`❌ [${requestId}] Error updating profile with Stripe customer ID:`, {
        error: updateError.message,
        code: updateError.code,
        details: updateError.details
      });
    } else {
      console.log(`✅ [${requestId}] Profile updated with Stripe customer ID`);
    }
  }
  
  // Create a checkout session
  const { url } = await PaymentService.createSubscriptionCheckout(
    stripeCustomerId,
    tier,
    user.id
  );
  
  if (!url) {
    console.error(`❌ [${requestId}] Failed to create checkout session`);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500, headers });
  }
  
  console.log(`✅ [${requestId}] Checkout session created:`, {
    url: url ? 'Valid URL generated' : 'No URL',
    userId: user.id,
    customerId: stripeCustomerId,
    tier: tier,
    timestamp: new Date().toISOString()
  });
  
  return NextResponse.json({ url }, { headers });
} 