import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PaymentService, PlanTierSchema } from '@/lib/payment';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

// Add OPTIONS method handler for CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Log request headers for debugging
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    // Properly await cookies
    const cookieStore = cookies();
    
    // Log cookies directly from the request header for debugging
    const cookieHeader = req.headers.get('cookie');
    console.log('Raw cookie header:', cookieHeader);
    
    if (cookieHeader) {
      const cookiePairs = cookieHeader.split(';').map(c => c.trim());
      const authCookies = cookiePairs.filter(c => c.startsWith('sb-') || c.includes('supabase'));
      console.log('Auth cookies from header:', authCookies);
    }
    
    // Parse the request body
    const body = await req.json();
    const { tier } = body;
    console.log('Requested tier:', tier);

    // Validate the tier
    const result = PlanTierSchema.safeParse(tier);
    if (!result.success || result.data === 'free') {
      console.log('Invalid tier:', tier);
      return new NextResponse(
        JSON.stringify({ error: 'Invalid subscription tier' }), 
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // Create a Supabase client directly with the cookie store
    const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore });
    console.log('Supabase client created with cookie store');
    
    // Log auth debug info
    try {
      const { data: session } = await supabase.auth.getSession();
      console.log('Session exists:', !!session.session);
      if (session.session) {
        const expiresAt = session.session.expires_at;
        if (expiresAt) {
          console.log('Session expires at:', new Date(expiresAt * 1000).toISOString());
          console.log('Current time:', new Date().toISOString());
          console.log('Session expired:', new Date(expiresAt * 1000) < new Date());
        } else {
          console.log('Session has no expiration time');
        }
        console.log('Session user ID:', session.session.user.id);
      }
    } catch (sessionError) {
      console.error('Error getting session:', sessionError);
    }
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('Auth result - User exists:', !!user, 'Error:', userError);

    if (userError || !user) {
      console.error('Authentication error details:', userError);
      return new NextResponse(
        JSON.stringify({ error: 'User not authenticated' }), 
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return new NextResponse(
        JSON.stringify({ error: 'Failed to fetch user profile' }), 
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    console.log('User profile found:', { 
      id: profile.id, 
      hasStripeCustomerId: !!profile.stripe_customer_id,
      tier: profile.subscription_tier || 'free'
    });

    let customerId = profile.stripe_customer_id || null;
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
        
        return new NextResponse(
          JSON.stringify({ url }), 
          { 
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
      }
    } catch (error) {
      console.error('Error with existing customer ID, creating a new one:', error);
      customerId = null;
      needsUpdate = true;
    }

    // If we reach here, either there was no customer ID or the existing one was invalid
    if (!customerId) {
      // Get a valid email address - first try profile email, then user email, then error
      const email = profile.email || user.email;
      
      if (!email || !email.includes('@')) {
        return new NextResponse(
          JSON.stringify({ error: 'Valid email address required for checkout. Please update your profile.' }),
          { 
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
      }
      
      customerId = await PaymentService.createOrRetrieveCustomer(email, user.id);
      needsUpdate = true;
    }

    // Update the user's profile with the new Stripe customer ID if needed
    if (needsUpdate && customerId) {
      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating profile with Stripe customer ID:', updateError);
          return new NextResponse(
            JSON.stringify({ error: 'Failed to update profile with Stripe customer ID' }),
            { 
              status: 500,
              headers: {
                'Content-Type': 'application/json',
              }
            }
          );
        }
      } catch (error) {
        console.error('Error updating profile:', error);
        return new NextResponse(
          JSON.stringify({ error: 'Failed to update profile with Stripe customer ID' }),
          { 
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
      }
    }

    // Create a checkout session with the valid customer ID
    if (!customerId) {
      return new NextResponse(
        JSON.stringify({ error: 'Failed to create or retrieve Stripe customer ID' }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    const { url } = await PaymentService.createSubscriptionCheckout(
      customerId,
      result.data,
      user.id
    );

    return new NextResponse(
      JSON.stringify({ url }), 
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    console.error('Checkout error:', error);
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred during checkout' }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
} 