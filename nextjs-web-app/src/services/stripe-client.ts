import { SubscriptionTier } from '@/types/supabase';
import { createClient } from '@/lib/supabase/client';

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
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '',
  },
  ultra: {
    name: 'Ultra',
    description: 'Premium access with unlimited features',
    price: 50.00,
    credits_per_month: 500,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_ULTRA_PRICE_ID || '',
  },
};

// Client-side function to initiate a subscription
export async function initiateSubscription(planType: SubscriptionTier) {
  try {
    // Call the API route to create a checkout session
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ planType }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create checkout session');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error initiating subscription:', error);
    throw error;
  }
}

// Client-side function to cancel a subscription
export async function cancelSubscription() {
  try {
    // Call the API route to cancel the subscription
    const response = await fetch('/api/cancel-subscription', {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to cancel subscription');
    }

    return await response.json();
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

// Client-side function to get user credits and subscription info
export async function getUserCreditsInfo() {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No authenticated user found');
    }
    
    // Get user profile with credits and subscription info
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('credits, subscription_tier')
      .eq('id', session.user.id)
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Get subscription details
    const tier = profile.subscription_tier || 'free';
    const planDetails = SUBSCRIPTION_PLANS[tier as SubscriptionTier];
    
    return {
      credits: profile.credits || 0,
      subscription: {
        tier: tier as SubscriptionTier,
        name: planDetails.name,
        description: planDetails.description,
        price: planDetails.price,
        creditsPerMonth: planDetails.credits_per_month,
      },
    };
  } catch (error) {
    console.error('Error getting user credits info:', error);
    throw error;
  }
} 