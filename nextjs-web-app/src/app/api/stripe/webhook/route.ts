import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import stripeClient from '@/lib/stripe';
import { PLANS } from '@/lib/stripe';

// Disable NextJS body parsing for webhooks
export const dynamic = 'force-dynamic';
export const skipMiddleware = true;
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const sig = req.headers.get('stripe-signature') as string;

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  try {
    // Verify webhook signature
    const event = stripeClient.webhooks.constructEvent(payload, sig, webhookSecret);
    
    // Initialize Supabase client
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
        const session = event.data.object as any;
        const userId = session.metadata?.userId;
        
        if (!userId) {
          console.error('No user ID in checkout session metadata');
          return NextResponse.json({ error: 'No user ID found' }, { status: 400 });
        }

        // Get subscription
        const subscription = await stripeClient.subscriptions.retrieve(session.subscription);
        
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
            credits: maxMonthlyCredits, // Reset credits to max based on plan
            subscription_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Error updating profile:', updateError);
          return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }
        
        // Record subscription history
        const { error: historyError } = await supabaseAdmin
          .from('subscription_history')
          .insert({
            user_id: userId,
            subscription_tier: subscriptionTier,
            status: subscription.status,
            amount_paid: session.amount_total / 100, // Convert from cents to dollars
            currency: session.currency,
          });
        
        if (historyError) {
          console.error('Error recording subscription history:', historyError);
          return NextResponse.json({ error: 'Failed to record subscription history' }, { status: 500 });
        }
        
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        
        // Only process subscription invoices
        if (invoice.subscription) {
          const subscription = await stripeClient.subscriptions.retrieve(invoice.subscription);
          const customer = await stripeClient.customers.retrieve(invoice.customer);
          
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
        const subscription = event.data.object as any;
        
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
        const subscription = event.data.object as any;
        
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