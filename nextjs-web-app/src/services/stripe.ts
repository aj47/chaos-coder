import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase/server';
import { SubscriptionTier } from '@/types/supabase';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

// Subscription plan details
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

// Create a Stripe checkout session
export async function createCheckoutSession(userId: string, planType: SubscriptionTier) {
  try {
    const supabase = await createServerClient();
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) throw new Error(profileError.message);
    
    // Get plan details
    const plan = SUBSCRIPTION_PLANS[planType];
    if (!plan || !plan.stripe_price_id) {
      throw new Error('Invalid plan or missing Stripe price ID');
    }
    
    // Create or retrieve Stripe customer
    let customerId = profile.stripe_customer_id;
    
    if (!customerId) {
      // Get user email from auth
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      
      const customer = await stripe.customers.create({
        email: userData.user.email,
        metadata: {
          userId: userId,
        },
      });
      
      customerId = customer.id;
      
      // Update user profile with Stripe customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }
    
    // Create checkout session
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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      metadata: {
        userId: userId,
        planType: planType,
      },
    });
    
    return { sessionId: session.id, url: session.url };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

// Handle Stripe webhook events
export async function handleStripeWebhook(event: Stripe.Event) {
  try {
    const supabase = await createServerClient();
    
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
    const supabase = await createServerClient();
    
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
    const supabase = await createServerClient();
    
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
    const supabase = await createServerClient();
    
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
    const supabase = await createServerClient();
    
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
  try {
    const supabase = await createServerClient();
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', userId)
      .single();
    
    if (profileError) throw new Error(profileError.message);
    
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