import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server-client'
import { updateUserProfile, createOrUpdateSubscription } from '@/lib/database'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
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
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
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
    status: subscription.status as any,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : undefined,
  })

  // Update user profile
  const subscriptionStatus = subscription.status === 'active' ? 'active' : 
                           subscription.status === 'canceled' ? 'canceled' :
                           subscription.status === 'past_due' ? 'past_due' :
                           subscription.status === 'unpaid' ? 'unpaid' : 'free'

  const subscriptionPlan = subscription.status === 'active' ? 'pro' : 'free'

  await updateUserProfile(userId, {
    subscription_status: subscriptionStatus as any,
    subscription_plan: subscriptionPlan as any,
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
  if (!invoice.subscription) return

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
  if (!invoice.subscription) return

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
  const supabase = createClient()
  
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
