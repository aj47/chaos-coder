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
    console.log("[DEBUG] Initiating subscription for plan:", planType);
    
    // Get the Supabase client to get the session
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No authenticated user found');
    }
    
    // Call the API route to create a checkout session
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ planType }),
    });

    // Get the raw response text first for debugging
    const responseText = await response.text();
    console.log("[DEBUG] Raw checkout session response:", responseText);
    
    // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("[DEBUG] Error parsing response:", parseError);
      throw new Error(`Failed to parse response: ${responseText}`);
    }

    if (!response.ok) {
      console.error("[DEBUG] Error response from server:", data);
      throw new Error(data.error || data.message || 'Failed to create checkout session');
    }

    // Check if we have a URL in the response
    if (!data.url) {
      console.error("[DEBUG] No URL in response:", data);
      throw new Error('No checkout URL returned from server');
    }

    return data;
  } catch (error) {
    console.error('[DEBUG] Error initiating subscription:', error);
    throw error;
  }
}

// Client-side function to cancel a subscription
export async function cancelSubscription() {
  try {
    // Get the Supabase client to get the session
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No authenticated user found');
    }
    
    // Call the API route to cancel the subscription
    const response = await fetch('/api/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
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
    
    console.log("[DEBUG] User ID for profile query:", session.user.id, "Type:", typeof session.user.id);
    
    // Instead of querying the profiles table directly, use a custom API endpoint
    // that can handle the type conversion properly
    try {
      const response = await fetch('/api/user/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        console.error("[DEBUG] Error fetching profile from API:", await response.text());
        throw new Error('Failed to fetch profile from API');
      }
      
      const data = await response.json();
      console.log("[DEBUG] Profile data from API:", data);
      
      if (data.profile) {
        // Get subscription details
        const tier = data.profile.subscription_tier || 'free';
        const planDetails = SUBSCRIPTION_PLANS[tier as SubscriptionTier];
        
        return {
          credits: data.profile.credits || 0,
          subscription: {
            tier: tier as SubscriptionTier,
            name: planDetails.name,
            description: planDetails.description,
            price: planDetails.price,
            creditsPerMonth: planDetails.credits_per_month,
          },
        };
      } else {
        // Return default values if no profile
        console.log("[DEBUG] No profile found, using default values");
        return {
          credits: 25,
          subscription: {
            tier: 'free' as SubscriptionTier,
            name: SUBSCRIPTION_PLANS.free.name,
            description: SUBSCRIPTION_PLANS.free.description,
            price: SUBSCRIPTION_PLANS.free.price,
            creditsPerMonth: SUBSCRIPTION_PLANS.free.credits_per_month,
          },
        };
      }
    } catch (error) {
      console.error("[DEBUG] Error in profile API call:", error);
      
      // If there's an error with the API call, return default values
      return {
        credits: 25,
        subscription: {
          tier: 'free' as SubscriptionTier,
          name: SUBSCRIPTION_PLANS.free.name,
          description: SUBSCRIPTION_PLANS.free.description,
          price: SUBSCRIPTION_PLANS.free.price,
          creditsPerMonth: SUBSCRIPTION_PLANS.free.credits_per_month,
        },
      };
    }
  } catch (error) {
    console.error('Error getting user credits info:', error);
    throw error;
  }
} 