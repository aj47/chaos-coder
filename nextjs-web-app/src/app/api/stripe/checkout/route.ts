import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment';
import { AuthService } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';

// Define a type for the user object
interface UserData {
  id: string;
  email?: string | null;
}

// Add OPTIONS method handler for CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: NextRequest) {
  console.log(`🔄 Starting checkout process`);
  
  try {
    // Log all request headers for debugging
    const headers = Object.fromEntries(req.headers.entries());
    console.log(`📊 Request headers:`, JSON.stringify(headers, null, 2));
    
    // Parse the request body first to get potential access token
    const body = await req.json();
    const { tier, accessToken: bodyToken, userId } = body;
    
    console.log(`🔄 Processing checkout for tier: ${tier}`);
    console.log(`📊 Access token in body: ${bodyToken ? `Present (length: ${bodyToken.length})` : 'Not present'}`);
    console.log(`📊 User ID in body: ${userId || 'Not present'}`);
    
    // Try to get the auth token from multiple sources
    // 1. Authorization header
    let authToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    console.log(`📊 Authorization header: ${authToken ? `Present (length: ${authToken.length})` : 'Not present'}`);
    
    // 2. Request body
    if (!authToken && bodyToken) {
      console.log(`✅ Using auth token from request body`);
      authToken = bodyToken;
    }
    
    // 3. Cookies as fallback
    if (!authToken) {
      console.log(`⚠️ No auth token found in header or body, checking cookies...`);
      
      // Log all cookies for debugging
      const allCookies = req.cookies.getAll();
      console.log(`📊 All cookies:`, allCookies.map(c => `${c.name}: ${c.value.substring(0, 20)}...`));
      
      // Try common Supabase cookie names
      const cookieNames = [
        'sb-access-token',
        'supabase-auth-token',
        'sb:token',
        'sb-auth-token',
        'sb-refresh-token',
        'sb-provider-token'
      ];
      
      for (const name of cookieNames) {
        const token = req.cookies.get(name)?.value;
        if (token) {
          console.log(`✅ Auth token found in cookie: ${name} (length: ${token.length})`);
          authToken = token;
          break;
        }
      }
      
      // If still not found, try to find any cookie that might contain the auth token
      if (!authToken) {
        console.log(`⚠️ No token found in common cookies, checking all cookies...`);
        
        const authCookie = allCookies.find(c => 
          c.name.includes('auth') || 
          c.name.includes('supabase') || 
          c.name.startsWith('sb-')
        );
        
        if (authCookie) {
          console.log(`✅ Found potential auth cookie: ${authCookie.name} (length: ${authCookie.value.length})`);
          authToken = authCookie.value;
        }
      }
    } else {
      console.log(`✅ Auth token found in header or body (length: ${authToken.length})`);
    }
    
    if (!authToken) {
      console.error(`❌ No auth token found in any source`);
      return NextResponse.json({ error: 'User not authenticated - No token found' }, { status: 401 });
    }
    
    console.log(`✅ Auth token extracted successfully (length: ${authToken.length}, first 10 chars: ${authToken.substring(0, 10)}...)`);
    
    // Try multiple authentication approaches
    
    // Approach 1: Use AuthService directly
    try {
      console.log(`🔄 Trying authentication with AuthService...`);
      const supabase = AuthService.createClient();
      
      // Set the session with the auth token
      await supabase.auth.setSession({
        access_token: authToken,
        refresh_token: '',
      });
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error(`❌ AuthService error:`, userError);
      } else if (user) {
        console.log(`✅ User authenticated via AuthService: ${user.id}`);
        
        // Continue with checkout using this user
        return await processCheckout(user as UserData, tier, supabase);
      }
    } catch (authServiceError) {
      console.error(`❌ AuthService approach failed:`, authServiceError);
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
      - Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'}
      - Anon key available: ${!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - Service role key available: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}
    `);
    return NextResponse.json({ error: 'User not authenticated - Invalid token' }, { status: 401 });
  } catch (error) {
    console.error(`❌ Checkout error:`, error);
    return NextResponse.json(
      { error: `Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// Helper function to process the checkout once we have a valid user
async function processCheckout(user: UserData, tier: string, supabase: SupabaseClient) {
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
    stripeCustomerId = await PaymentService.createOrRetrieveCustomer(
      user.email || 'unknown@example.com',
      user.id
    );
    
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
    tier as 'pro' | 'ultra',
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
        - Current tier: ${profile.subscription_tier || 'free'}
        - Current status: ${profile.subscription_status || 'none'}
      `);
  
  return NextResponse.json({ url });
} 