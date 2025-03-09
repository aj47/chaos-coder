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
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = await stripeClient.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const supabase = createClient();

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as StripeCheckoutSession;
      const sessionMetadata = session.metadata || {};
      const userId = sessionMetadata.userId;
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID not found in session metadata' }, { status: 400 });
      }
      
      if (sessionMetadata.isCreditPurchase === 'true') {
        const creditsToAdd = parseInt(sessionMetadata.credits || '0', 10);
        
        if (isNaN(creditsToAdd) || creditsToAdd <= 0) {
          return NextResponse.json({ error: 'Invalid credit amount' }, { status: 400 });
        }
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', userId)
          .single();
        
        if (profileError) {
          return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
        }
        
        const currentCredits = profile?.credits || 0;
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            credits: currentCredits + creditsToAdd,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        if (updateError) {
          return NextResponse.json({ error: 'Failed to update user credits' }, { status: 500 });
        }
        
        const { error: historyError } = await supabase
          .from('credit_history')
          .insert({
            user_id: userId,
            amount: creditsToAdd,
            type: 'purchase',
            description: `Purchased ${creditsToAdd} credits`,
            created_at: new Date().toISOString()
          });
        
        if (historyError) {
          return NextResponse.json({ error: 'Failed to record credit purchase history' }, { status: 500 });
        }
        
        return NextResponse.json({ message: 'Credit purchase processed' }, { status: 200 });
      } else {
        const subscriptionId = session.subscription as string;
        const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
        
        const priceId = subscription.items.data[0].price.id;
        
        let tier = 'FREE';
        if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
          tier = 'PRO';
        } else if (priceId === process.env.STRIPE_ULTRA_PRICE_ID) {
          tier = 'ULTRA';
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            subscription_tier: tier,
            subscription_status: subscription.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        if (updateError) {
          return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
        }
        
        const { error: historyError } = await supabase
          .from('subscription_history')
          .insert({
            user_id: userId,
            tier,
            status: subscription.status,
            description: `Subscription ${subscription.status} for ${tier} plan`,
            created_at: new Date().toISOString()
          });
        
        if (historyError) {
          return NextResponse.json({ error: 'Failed to record subscription history' }, { status: 500 });
        }
      }
      
      return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });
    }
    
    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: `Webhook error: ${error.message}` }, { status: 500 });
  }
} 