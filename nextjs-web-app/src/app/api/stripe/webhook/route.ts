import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server-client'
import { updateUserProfile, createOrUpdateSubscription, updateTokenPurchase, addTokensToUser, getTokenPurchaseByPaymentIntent } from '@/lib/database'
import { trackSubscription, captureError, ErrorCategory, trackApiCall } from '@/lib/sentry'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    trackApiCall('/api/stripe/webhook', 'POST', Date.now() - startTime, 400);
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_CONFIG.WEBHOOK_SECRET
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    captureError(
      error instanceof Error ? error : new Error('Webhook signature verification failed'),
      ErrorCategory.PAYMENT,
      { action: 'webhook_signature_verification' }
    )
    trackApiCall('/api/stripe/webhook', 'POST', Date.now() - startTime, 400);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      // Token purchase events
      case 'payment_intent.succeeded':
        await handleTokenPurchaseSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handleTokenPurchaseFailed(event.data.object as Stripe.PaymentIntent)
        break

      // Legacy subscription events (keep for existing subscribers)
      case 'customer.subscription.created':
        trackSubscription('upgrade', { plan: 'pro', event_type: 'created' })
        await handleSubscriptionChange(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.updated':
        trackSubscription('renew', { plan: 'pro', event_type: 'updated' })
        await handleSubscriptionChange(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        trackSubscription('cancel', { plan: 'pro', event_type: 'deleted' })
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        trackSubscription('renew', { plan: 'pro', event_type: 'payment_succeeded' })
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        trackSubscription('downgrade', { plan: 'pro', event_type: 'payment_failed' })
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        // Unhandled event type - no action needed
    }

    trackApiCall('/api/stripe/webhook', 'POST', Date.now() - startTime, 200);
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    captureError(
      error instanceof Error ? error : new Error('Webhook processing failed'),
      ErrorCategory.PAYMENT,
      {
        action: 'webhook_processing',
        event_type: event.type,
        event_id: event.id
      }
    )
    trackApiCall('/api/stripe/webhook', 'POST', Date.now() - startTime, 500);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const userId = await getUserIdFromCustomerId(customerId)

  if (!userId) {
    console.error('User not found for customer:', customerId)
    return
  }

  // Update subscription in database
  await createOrUpdateSubscription({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    stripe_price_id: subscription.items.data[0].price.id,
    status: subscription.status as 'active' | 'canceled' | 'past_due' | 'unpaid',
    current_period_start: (subscription as any).current_period_start ? new Date((subscription as any).current_period_start * 1000).toISOString() : new Date().toISOString(),
    current_period_end: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : new Date().toISOString(),
    cancel_at_period_end: (subscription as any).cancel_at_period_end || false,
    canceled_at: (subscription as any).canceled_at ? new Date((subscription as any).canceled_at * 1000).toISOString() : undefined,
  })

  // Update user profile
  const subscriptionStatus = subscription.status === 'active' ? 'active' : 
                           subscription.status === 'canceled' ? 'canceled' :
                           subscription.status === 'past_due' ? 'past_due' :
                           subscription.status === 'unpaid' ? 'unpaid' : 'free'

  const subscriptionPlan = subscription.status === 'active' ? 'pro' : 'free'

  await updateUserProfile(userId, {
    subscription_status: subscriptionStatus as 'free' | 'active' | 'canceled' | 'past_due' | 'unpaid',
    subscription_plan: subscriptionPlan as 'free' | 'pro',
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const userId = await getUserIdFromCustomerId(customerId)

  if (!userId) {
    console.error('User not found for customer:', customerId)
    return
  }

  // Update user profile to free plan
  await updateUserProfile(userId, {
    subscription_status: 'canceled',
    subscription_plan: 'free',
  })
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!(invoice as any).subscription) return

  const customerId = invoice.customer as string
  const userId = await getUserIdFromCustomerId(customerId)

  if (!userId) {
    console.error('User not found for customer:', customerId)
    return
  }

  // Reset daily generation count on successful payment
  await updateUserProfile(userId, {
    daily_generations_used: 0,
    daily_generations_reset_date: new Date().toISOString().split('T')[0],
  })
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!(invoice as any).subscription) return

  const customerId = invoice.customer as string
  const userId = await getUserIdFromCustomerId(customerId)

  if (!userId) {
    console.error('User not found for customer:', customerId)
    return
  }

  // Update subscription status to past_due
  await updateUserProfile(userId, {
    subscription_status: 'past_due',
  })
}

async function getUserIdFromCustomerId(customerId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (error || !data) {
    return null
  }

  return data.id
}

async function handleTokenPurchaseSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const paymentIntentId = paymentIntent.id
  const customerId = paymentIntent.customer as string

  if (!customerId) {
    console.error('No customer ID found for payment intent:', paymentIntentId)
    return
  }

  // Get user ID from customer ID
  const userId = await getUserIdFromCustomerId(customerId)
  if (!userId) {
    console.error('User not found for customer:', customerId)
    return
  }

  // Get token purchase record
  const tokenPurchase = await getTokenPurchaseByPaymentIntent(paymentIntentId)
  if (!tokenPurchase) {
    console.error('Token purchase not found for payment intent:', paymentIntentId)
    return
  }

  // Update purchase status to completed
  await updateTokenPurchase(paymentIntentId, { status: 'completed' })

  // Add tokens to user balance
  const tokensAdded = await addTokensToUser(userId, tokenPurchase.tokens_purchased)
  if (!tokensAdded) {
    console.error('Failed to add tokens to user:', userId)
    return
  }

  console.log(`Successfully added ${tokenPurchase.tokens_purchased} tokens to user ${userId}`)
}

async function handleTokenPurchaseFailed(paymentIntent: Stripe.PaymentIntent) {
  const paymentIntentId = paymentIntent.id

  // Update purchase status to failed
  await updateTokenPurchase(paymentIntentId, { status: 'failed' })

  console.log(`Token purchase failed for payment intent: ${paymentIntentId}`)
}
