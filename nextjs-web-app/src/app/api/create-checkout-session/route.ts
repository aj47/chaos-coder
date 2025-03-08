import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/services/stripe';
import { SubscriptionTier } from '@/types/supabase';
import { createClient as createServerClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Debug environment variables
    console.log("[DEBUG] Environment variables check:");
    console.log("[DEBUG] NEXT_PUBLIC_APP_URL:", process.env.NEXT_PUBLIC_APP_URL);
    console.log("[DEBUG] STRIPE_SECRET_KEY exists:", !!process.env.STRIPE_SECRET_KEY);
    console.log("[DEBUG] STRIPE_PRO_PRICE_ID:", process.env.STRIPE_PRO_PRICE_ID);
    console.log("[DEBUG] STRIPE_ULTRA_PRICE_ID:", process.env.STRIPE_ULTRA_PRICE_ID);
    
    // Get the request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("[DEBUG] Error parsing request body:", parseError);
      return NextResponse.json({ 
        error: 'Invalid request body',
        message: 'Could not parse request body as JSON'
      }, { status: 400 });
    }
    
    const { planType } = body;
    
    console.log("[DEBUG] Create checkout session request for plan:", planType);
    
    if (!planType) {
      return NextResponse.json({ 
        error: 'Missing planType',
        message: 'The planType parameter is required'
      }, { status: 400 });
    }
    
    // Validate plan type
    if (!['pro', 'ultra'].includes(planType)) {
      return NextResponse.json({ 
        error: 'Invalid planType',
        message: `Plan type "${planType}" is not valid. Must be one of: pro, ultra`
      }, { status: 400 });
    }
    
    // Check if price ID exists for the plan
    const priceIdKey = `STRIPE_${planType.toUpperCase()}_PRICE_ID`;
    const priceId = process.env[priceIdKey];
    
    if (!priceId) {
      console.error(`[DEBUG] Missing price ID for plan ${planType}. Environment variable ${priceIdKey} is not set.`);
      return NextResponse.json({ 
        error: 'Configuration error',
        message: `Price ID for plan "${planType}" is not configured. Please check your environment variables.`
      }, { status: 500 });
    }
    
    // Create a Supabase client using the server client
    let supabase;
    try {
      console.log("[DEBUG] API: Creating Supabase client with server client");
      supabase = await createServerClient();
    } catch (supabaseError) {
      console.error("[DEBUG] Error creating Supabase client:", supabaseError);
      return NextResponse.json({ 
        error: 'Authentication error',
        message: 'Could not initialize authentication client'
      }, { status: 500 });
    }
    
    // Get the current user
    let session;
    try {
      const { data } = await supabase.auth.getSession();
      session = data.session;
    } catch (sessionError) {
      console.error("[DEBUG] Error getting session:", sessionError);
      return NextResponse.json({ 
        error: 'Authentication error',
        message: 'Could not retrieve user session'
      }, { status: 401 });
    }
    
    if (!session) {
      console.log("[DEBUG] No authenticated session found");
      return NextResponse.json({ 
        error: 'Not authenticated',
        message: 'You must be logged in to perform this action'
      }, { status: 401 });
    }
    
    console.log("[DEBUG] Creating checkout session for user:", session.user.id, "plan:", planType);
    
    try {
      // Create a checkout session
      const { sessionId, url } = await createCheckoutSession(session.user.id, planType as SubscriptionTier);
      
      if (!url) {
        console.error("[DEBUG] Checkout session created but no URL returned");
        return NextResponse.json({ 
          error: 'Checkout error',
          message: 'Checkout session created but no URL was returned'
        }, { status: 500 });
      }
      
      console.log("[DEBUG] Checkout session created successfully:", sessionId);
      return NextResponse.json({ sessionId, url });
    } catch (checkoutError) {
      console.error("[DEBUG] Detailed checkout error:", checkoutError);
      
      // Check for specific error types
      if (checkoutError instanceof Error) {
        const errorMessage = checkoutError.message;
        
        if (errorMessage.includes('invalid input syntax for type bigint')) {
          return NextResponse.json({ 
            error: 'Database schema issue',
            message: 'The id column in profiles table is defined as bigint, but auth user IDs are UUIDs.'
          }, { status: 500 });
        }
        
        if (errorMessage.includes('stripe_price_id')) {
          return NextResponse.json({ 
            error: 'Invalid Stripe price ID',
            message: 'Check your environment variables for valid Stripe price IDs.'
          }, { status: 500 });
        }
        
        if (errorMessage.includes('No such customer')) {
          return NextResponse.json({ 
            error: 'Stripe customer error',
            message: 'Could not find or create a Stripe customer for your account.'
          }, { status: 500 });
        }
        
        return NextResponse.json({ 
          error: 'Checkout error',
          message: errorMessage
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Unknown error',
        message: 'An unknown error occurred while creating the checkout session'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[DEBUG] Unhandled error in create-checkout-session:', error);
    return NextResponse.json(
      { 
        error: 'Server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
} 