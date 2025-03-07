import Stripe from 'stripe';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { SubscriptionTier } from '@/types/supabase';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

// This is a server-side only import and initialization
// It will only be used in server-side functions
let stripe: Stripe | null = null;

// Only initialize Stripe on the server side
if (typeof window === 'undefined') {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-02-24.acacia',
  });
}

// Subscription plan details - safe to use on client side
export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    description: 'Basic access with limited features',
    price: 0,
    credits_per_month: 25,
    stripe_price_id: '',
  },
  pro: {
    name: 'Pro',
    description: 'Advanced features with more credits',
    price: 10.00,
    credits_per_month: 100,
    stripe_price_id: process.env.STRIPE_PRO_PRICE_ID || '',
  },
  ultra: {
    name: 'Ultra',
    description: 'Premium access with unlimited features',
    price: 50.00,
    credits_per_month: 500,
    stripe_price_id: process.env.STRIPE_ULTRA_PRICE_ID || '',
  },
};

// The rest of the file contains server-side only functions
// These should only be called from API routes or server components

// Create a Stripe checkout session
export async function createCheckoutSession(userId: string, planType: SubscriptionTier) {
  // Ensure we're on the server side
  if (typeof window !== 'undefined') {
    throw new Error('This function can only be called from the server side');
  }
  
  if (!stripe) {
    console.error("[DEBUG] Stripe client not initialized. Check STRIPE_SECRET_KEY environment variable.");
    throw new Error('Stripe client not initialized. Check your environment variables.');
  }
  
  try {
    console.log("[DEBUG] Starting checkout session creation for user:", userId, "plan:", planType);
    
    // Create a Supabase client
    const supabase = createServerComponentClient<Database>({ cookies });
    
    // First, check if we have valid Stripe price IDs
    const plan = SUBSCRIPTION_PLANS[planType];
    if (!plan) {
      throw new Error(`Invalid plan type: ${planType}`);
    }
    
    if (!plan.stripe_price_id) {
      console.error("[DEBUG] Missing Stripe price ID for plan:", planType);
      throw new Error(`Missing Stripe price ID for plan: ${planType}. Check your environment variables.`);
    }
    
    // Validate that the price ID is in the correct format
    if (!plan.stripe_price_id.startsWith('price_')) {
      console.error("[DEBUG] Invalid Stripe price ID format:", plan.stripe_price_id);
      throw new Error(`Invalid Stripe price ID format for plan ${planType}: ${plan.stripe_price_id}. Price IDs must start with "price_", not "prod_".`);
    }
    
    console.log("[DEBUG] Using Stripe price ID:", plan.stripe_price_id);
    
    // Try to get user profile
    let profile;
    let profileError;
    
    try {
      const result = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      profile = result.data;
      profileError = result.error;
      
      if (profileError) {
        console.error("[DEBUG] Error fetching profile:", profileError);
      } else if (!profile) {
        console.log("[DEBUG] No profile found for user:", userId);
      } else {
        console.log("[DEBUG] Profile found for user:", userId);
      }
    } catch (error) {
      console.error("[DEBUG] Exception fetching profile:", error);
      profileError = error;
    }
    
    // If there's a profile error or no profile, try to create one
    if (profileError || !profile) {
      console.log("[DEBUG] Creating profile for user:", userId);
      
      try {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            credits: 25,
            subscription_tier: 'free',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (createError) {
          console.error("[DEBUG] Error creating profile:", createError);
        } else {
          console.log("[DEBUG] Profile created successfully");
          profile = newProfile;
        }
      } catch (createError) {
        console.error("[DEBUG] Exception creating profile:", createError);
      }
    }
    
    // Create or retrieve Stripe customer
    let customerId = profile?.stripe_customer_id;
    
    if (!customerId) {
      console.log("[DEBUG] No Stripe customer ID found, creating new customer");
      
      // Get user email from auth
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("[DEBUG] Error getting user data:", userError);
        throw new Error(`Failed to get user data: ${userError.message}`);
      }
      
      if (!userData.user.email) {
        throw new Error('User has no email address');
      }
      
      console.log("[DEBUG] Creating Stripe customer for email:", userData.user.email);
      
      try {
        const customer = await stripe.customers.create({
          email: userData.user.email,
          metadata: {
            userId: userId,
          },
        });
        
        customerId = customer.id;
        console.log("[DEBUG] Created Stripe customer:", customerId);
        
        // Try to update user profile with Stripe customer ID
        if (profile) {
          try {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ stripe_customer_id: customerId })
              .eq('id', userId);
            
            if (updateError) {
              console.error("[DEBUG] Error updating profile with customer ID:", updateError);
              // Continue anyway, as we already have the customer ID
            } else {
              console.log("[DEBUG] Updated profile with customer ID");
            }
          } catch (updateError) {
            console.error("[DEBUG] Exception updating profile with customer ID:", updateError);
            // Continue anyway, as we already have the customer ID
          }
        }
      } catch (stripeError) {
        console.error("[DEBUG] Error creating Stripe customer:", stripeError);
        throw new Error(`Failed to create Stripe customer: ${stripeError instanceof Error ? stripeError.message : String(stripeError)}`);
      }
    } else {
      console.log("[DEBUG] Using existing Stripe customer ID:", customerId);
    }
    
    // Create checkout session
    console.log("[DEBUG] Creating Stripe checkout session");
    
    try {
      // Validate the success and cancel URLs
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appUrl) {
        console.error("[DEBUG] NEXT_PUBLIC_APP_URL is not set");
        throw new Error('NEXT_PUBLIC_APP_URL environment variable is not set');
      }
      
      const successUrl = `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${appUrl}/dashboard`;
      
      console.log("[DEBUG] Success URL:", successUrl);
      console.log("[DEBUG] Cancel URL:", cancelUrl);
      
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: plan.stripe_price_id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: userId,
          planType: planType,
        },
      });
      
      console.log("[DEBUG] Checkout session created:", session.id);
      console.log("[DEBUG] Checkout URL:", session.url);
      
      return { sessionId: session.id, url: session.url };
    } catch (checkoutError: unknown) {
      console.error("[DEBUG] Error creating checkout session:", checkoutError);
      
      // Check for specific Stripe errors
      if (
        typeof checkoutError === 'object' && 
        checkoutError !== null && 
        'type' in checkoutError && 
        'param' in checkoutError &&
        checkoutError.type === 'StripeInvalidRequestError'
      ) {
        if (checkoutError.param === 'line_items[0].price') {
          throw new Error(`Invalid Stripe price ID: ${plan.stripe_price_id}. Check your environment variables.`);
        }
      }
      
      throw new Error(`Failed to create checkout session: ${checkoutError instanceof Error ? checkoutError.message : String(checkoutError)}`);
    }
  } catch (error) {
    console.error('[DEBUG] Error in createCheckoutSession:', error);
    throw error;
  }
}

// Handle Stripe webhook events
export async function handleStripeWebhook(event: Stripe.Event) {
  try {
    const supabase = await createServerComponentClient<Database>({ cookies });
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, planType } = session.metadata as { userId: string; planType: SubscriptionTier };
        
        if (!userId || !planType) {
          throw new Error('Missing userId or planType in session metadata');
        }
        
        // Update user subscription
        await supabase
          .from('profiles')
          .update({
            subscription_tier: planType,
            stripe_subscription_id: session.subscription as string,
          })
          .eq('id', userId);
        
        // Add credits based on plan
        const plan = SUBSCRIPTION_PLANS[planType];
        await addCreditsToUser(userId, plan.credits_per_month, 'Subscription credits');
        
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Get user by customer ID
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('stripe_customer_id', customerId)
          .single();
        
        if (error) throw new Error(error.message);
        
        // Update subscription status
        await supabase
          .from('profiles')
          .update({
            subscription_tier: subscription.status === 'active' ? profile.subscription_tier : 'free',
          })
          .eq('id', profile.id);
        
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Reset user to free plan
        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            stripe_subscription_id: null,
          })
          .eq('stripe_customer_id', customerId);
        
        break;
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error handling Stripe webhook:', error);
    throw error;
  }
}

// Add credits to a user
export async function addCreditsToUser(userId: string, amount: number, description: string) {
  try {
    const supabase = await createServerComponentClient<Database>({ cookies });
    
    // Get current credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
    
    if (profileError) throw new Error(profileError.message);
    
    const currentCredits = profile.credits || 0;
    const newCredits = currentCredits + amount;
    
    // Update user credits
    await supabase
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', userId);
    
    // Record transaction
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: amount,
      description: description,
      transaction_type: amount > 0 ? 'subscription' : 'usage',
    });
    
    return { success: true, credits: newCredits };
  } catch (error) {
    console.error('Error adding credits to user:', error);
    throw error;
  }
}

// Use credits (deduct from user)
export async function deductCredits(userId: string, amount: number, description: string) {
  try {
    const supabase = await createServerComponentClient<Database>({ cookies });
    
    // Get current credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
    
    if (profileError) throw new Error(profileError.message);
    
    const currentCredits = profile.credits || 0;
    
    // Check if user has enough credits
    if (currentCredits < amount) {
      return { success: false, message: 'Not enough credits' };
    }
    
    const newCredits = currentCredits - amount;
    
    // Update user credits
    await supabase
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', userId);
    
    // Record transaction
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: -amount,
      description: description,
      transaction_type: 'usage',
    });
    
    return { success: true, credits: newCredits };
  } catch (error) {
    console.error('Error using credits:', error);
    throw error;
  }
}

// Get user credits and subscription info
export async function getUserCreditsInfo(userId: string) {
  try {
    const supabase = await createServerComponentClient<Database>({ cookies });
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw new Error(error.message);
    
    const tier = profile.subscription_tier || 'free';
    const plan = SUBSCRIPTION_PLANS[tier as SubscriptionTier];
    
    return {
      credits: profile.credits || 0,
      subscription: {
        tier: tier,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        creditsPerMonth: plan.credits_per_month,
      },
    };
  } catch (error) {
    console.error('Error getting user credits info:', error);
    throw error;
  }
}

// Update user subscription
export async function updateUserSubscription(userId: string, subscriptionData: {
  tier?: SubscriptionTier;
  customerId?: string;
  subscriptionId?: string;
}) {
  try {
    const supabase = await createServerComponentClient<Database>({ cookies });
    
    await supabase
      .from('profiles')
      .update({
        subscription_tier: subscriptionData.tier,
        stripe_customer_id: subscriptionData.customerId,
        stripe_subscription_id: subscriptionData.subscriptionId,
      })
      .eq('id', userId);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user subscription:', error);
    throw error;
  }
}

// Cancel a subscription
export async function cancelSubscription(userId: string) {
  // Ensure we're on the server side
  if (typeof window !== 'undefined' || !stripe) {
    throw new Error('This function can only be called from the server side');
  }
  
  try {
    // Create a Supabase client
    const supabase = createServerComponentClient<Database>({ cookies });
    
    // Get user profile with subscription ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', userId)
      .single();
    
    if (profileError) throw new Error(profileError.message);
    
    // Check if user has an active subscription
    if (!profile.stripe_subscription_id) {
      throw new Error('No active subscription found');
    }
    
    // Cancel the subscription in Stripe
    await stripe.subscriptions.cancel(profile.stripe_subscription_id);
    
    // Update user profile
    await supabase
      .from('profiles')
      .update({
        subscription_tier: 'free',
        stripe_subscription_id: null,
      })
      .eq('id', userId);
    
    return { success: true };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
} 