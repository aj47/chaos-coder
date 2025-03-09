import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import stripeClient from '@/lib/stripe';
import { PLANS } from '@/lib/stripe';
import Stripe from 'stripe';

// Define types for Stripe event objects
type StripeCheckoutSession = Stripe.Checkout.Session;
type StripeInvoice = Stripe.Invoice;
type StripeSubscription = Stripe.Subscription;

// Disable NextJS body parsing for webhooks
export const dynamic = 'force-dynamic';
export const skipMiddleware = true;
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  console.log('Webhook received:', new Date().toISOString());
  const payload = await req.text();
  const sig = req.headers.get('stripe-signature') as string;

  if (!sig) {
    console.log('No signature in webhook request');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.log('Webhook secret not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  try {
    // Verify webhook signature
    console.log('Verifying webhook signature');
    const event = stripeClient.webhooks.constructEvent(payload, sig, webhookSecret);
    console.log('Webhook event type:', event.type);
    
    // Initialize Supabase client
    console.log('Initializing Supabase client');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('Processing checkout.session.completed event');
        const session = event.data.object as StripeCheckoutSession;
        const userId = session.metadata?.userId;
        
        if (!userId) {
          console.error('No user ID in checkout session metadata');
          return NextResponse.json({ error: 'No user ID found' }, { status: 400 });
        }
        console.log('User ID from session metadata:', userId);

        // Check if this is a credit purchase (one-time payment) or a subscription
        if (session.metadata?.purchaseType === 'credits' && session.mode === 'payment') {
          console.log('Processing credit purchase');
          const creditsToAdd = parseInt(session.metadata.creditsToAdd || '0', 10);
          
          if (!creditsToAdd) {
            console.error('Invalid credits amount in metadata');
            return NextResponse.json({ error: 'Invalid credits amount' }, { status: 400 });
          }
          
          // Get the current user profile
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single();
            
          if (profileError) {
            console.error('Error fetching profile:', profileError);
            return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
          }
            
          const currentCredits = profile?.credits || 0;
          
          // Update the user's credits
          console.log(`Adding ${creditsToAdd} credits to user ${userId}`);
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              credits: currentCredits + creditsToAdd,
            })
            .eq('id', userId);
            
          if (updateError) {
            console.error('Error updating profile credits:', updateError);
            return NextResponse.json({ error: 'Failed to update profile credits' }, { status: 500 });
          }
          
          // Record credit purchase history
          console.log('Recording credit purchase history');
          const { error: historyError } = await supabaseAdmin
            .from('credit_purchases')
            .insert({
              user_id: userId,
              amount: creditsToAdd,
              cost: session.amount_total ? session.amount_total / 100 : 0, // Convert from cents to dollars
              currency: session.currency,
            });
            
          if (historyError) {
            console.error('Error recording credit purchase history:', historyError);
            return NextResponse.json({ error: 'Failed to record credit purchase history' }, { status: 500 });
          }
          
          console.log('Credit purchase processed successfully');
          break;
        } else {
          // Regular subscription checkout
          // Get subscription
          console.log('Retrieving subscription details');
          const subscription = await stripeClient.subscriptions.retrieve(session.subscription as string);
          console.log('Subscription retrieved:', subscription.id);
          
          // Determine subscription tier
          let subscriptionTier = 'free';
          let maxMonthlyCredits = 100;
          
          console.log('Checking price ID:', subscription.items.data[0].price.id);
          console.log('Expected PRO price ID:', process.env.STRIPE_PRO_PRICE_ID);
          console.log('Expected ULTRA price ID:', process.env.STRIPE_ULTRA_PRICE_ID);

          if (subscription.items.data[0].price.id === process.env.STRIPE_PRO_PRICE_ID) {
            console.log('Setting tier to PRO');
            subscriptionTier = 'pro';
            maxMonthlyCredits = PLANS.PRO.credits;
          } else if (subscription.items.data[0].price.id === process.env.STRIPE_ULTRA_PRICE_ID) {
            console.log('Setting tier to ULTRA');
            subscriptionTier = 'ultra';
            maxMonthlyCredits = PLANS.ULTRA.credits;
          } else {
            console.log('Price ID did not match any expected IDs, defaulting to free tier');
          }
          
          // Update the user's profile
          console.log('Updating user profile with subscription details:', {
            subscription_tier: subscriptionTier,
            subscription_status: subscription.status,
            max_monthly_credits: maxMonthlyCredits,
            credits: maxMonthlyCredits,
          });

          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              subscription_tier: subscriptionTier,
              subscription_status: subscription.status,
              max_monthly_credits: maxMonthlyCredits,
              credits: maxMonthlyCredits, // Reset credits to max based on plan
              subscription_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', userId);
          
          if (updateError) {
            console.error('Error updating profile:', updateError);
            return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
          }
          console.log('Profile updated successfully');
          
          // Record subscription history
          console.log('Recording subscription history');
          const { error: historyError } = await supabaseAdmin
            .from('subscription_history')
            .insert({
              user_id: userId,
              subscription_tier: subscriptionTier,
              status: subscription.status,
              amount_paid: session.amount_total ? session.amount_total / 100 : 0, // Convert from cents to dollars
              currency: session.currency,
            });
          
          if (historyError) {
            console.error('Error recording subscription history:', historyError);
            return NextResponse.json({ error: 'Failed to record subscription history' }, { status: 500 });
          }
          console.log('Subscription history recorded successfully');
        }
        
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as StripeInvoice;
        
        // Only process subscription invoices
        if (invoice.subscription) {
          const subscription = await stripeClient.subscriptions.retrieve(invoice.subscription as string);
          
          // Find the user by Stripe customer ID
          const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', invoice.customer)
            .limit(1);
          
          if (profilesError || !profiles || profiles.length === 0) {
            console.error('Error fetching profile for Stripe customer:', profilesError || 'No profile found');
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
          }
          
          const userId = profiles[0].id;
          
          // Determine subscription tier
          let subscriptionTier = 'free';
          let maxMonthlyCredits = 100;
          
          if (subscription.items.data[0].price.id === process.env.STRIPE_PRO_PRICE_ID) {
            subscriptionTier = 'pro';
            maxMonthlyCredits = PLANS.PRO.credits;
          } else if (subscription.items.data[0].price.id === process.env.STRIPE_ULTRA_PRICE_ID) {
            subscriptionTier = 'ultra';
            maxMonthlyCredits = PLANS.ULTRA.credits;
          }
          
          // Reset credits for the new billing period
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              credits: maxMonthlyCredits,
              subscription_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', userId);
          
          if (updateError) {
            console.error('Error updating profile credits:', updateError);
            return NextResponse.json({ error: 'Failed to update profile credits' }, { status: 500 });
          }
          
          // Record subscription renewal
          const { error: historyError } = await supabaseAdmin
            .from('subscription_history')
            .insert({
              user_id: userId,
              subscription_tier: subscriptionTier,
              status: subscription.status,
              amount_paid: invoice.amount_paid / 100, // Convert from cents to dollars
              currency: invoice.currency,
            });
          
          if (historyError) {
            console.error('Error recording subscription history:', historyError);
            return NextResponse.json({ error: 'Failed to record subscription history' }, { status: 500 });
          }
        }
        
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as StripeSubscription;
        
        // Find the user by Stripe customer ID
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', subscription.customer)
          .limit(1);
        
        if (profilesError || !profiles || profiles.length === 0) {
          console.error('Error fetching profile for Stripe customer:', profilesError || 'No profile found');
          return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }
        
        const userId = profiles[0].id;
        
        // Determine subscription tier
        let subscriptionTier = 'free';
        let maxMonthlyCredits = 100;
        
        if (subscription.items.data[0].price.id === process.env.STRIPE_PRO_PRICE_ID) {
          subscriptionTier = 'pro';
          maxMonthlyCredits = PLANS.PRO.credits;
        } else if (subscription.items.data[0].price.id === process.env.STRIPE_ULTRA_PRICE_ID) {
          subscriptionTier = 'ultra';
          maxMonthlyCredits = PLANS.ULTRA.credits;
        }
        
        // Update the user's profile
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: subscriptionTier,
            subscription_status: subscription.status,
            max_monthly_credits: maxMonthlyCredits,
            subscription_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Error updating profile:', updateError);
          return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }
        
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as StripeSubscription;
        
        // Find the user by Stripe customer ID
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', subscription.customer)
          .limit(1);
        
        if (profilesError || !profiles || profiles.length === 0) {
          console.error('Error fetching profile for Stripe customer:', profilesError || 'No profile found');
          return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }
        
        const userId = profiles[0].id;
        
        // Update user to free plan
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            max_monthly_credits: 100,
            subscription_period_start: null,
            subscription_period_end: null,
          })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Error updating profile:', updateError);
          return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }
        
        break;
      }
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
} 