import Stripe from 'stripe';
import { z } from 'zod';
import { AuthService } from '@/lib/auth';

// Define a type for the Supabase client to avoid 'any'
type SupabaseClient = ReturnType<typeof AuthService.createClient>;

// Define type for Stripe session to avoid any type
interface StripeSession {
  id?: string;
  metadata?: Record<string, string>;
  amount_total?: number;
  currency?: string;
  customer?: string;
  subscription?: string;
}

// Define type for Stripe subscription
interface StripeSubscription {
  id?: string;
  customer: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  currency?: string;
  items: {
    data: Array<{
      price: {
        id: string;
        product: string;
        unit_amount?: number;
      }
    }>
  }
}

// Define type for Stripe invoice
interface StripeInvoice {
  customer: string;
  id: string;
}

// Define type for Stripe customer
interface StripeCustomer {
  id: string;
  email?: string;
  metadata?: Record<string, string>;
  deleted?: boolean;
}

/**
 * Subscription plan configuration
 */
export const PLANS = {
  FREE: {
    name: 'Free',
    tier: 'free',
    credits: 30,
    price: 0,
    features: ['30 free credits per day', 'Max 3x generations'],
  },
  PRO: {
    name: 'Pro',
    tier: 'pro',
    credits: 100,
    price: 10,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: ['100 free credits per day', 'Ability to configure vibes', 'Buy additional credits: $1 = 15 credits'],
    topUpRate: 15, // Credits per $1
  },
  ULTRA: {
    name: 'Ultra',
    tier: 'ultra',
    credits: 1000,
    price: 50,
    priceId: process.env.STRIPE_ULTRA_PRICE_ID,
    features: ['1000 free credits per day', 'Everything from other plans', 'Priority support', 'Buy additional credits: $1 = 30 credits', 'Generations can be saved (coming soon)'],
    topUpRate: 30, // Credits per $1
  },
};

// Define schema for plan tiers
export const PlanTierSchema = z.enum(['free', 'pro', 'ultra']);
export type PlanTier = z.infer<typeof PlanTierSchema>;

/**
 * Centralized payment service that provides methods for all payment-related operations
 */
export class PaymentService {
  private static stripe: Stripe | null = null;

  /**
   * Get or initialize Stripe instance
   */
  static getStripe(): Stripe {
    if (this.stripe) {
      return this.stripe;
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('Missing Stripe secret key');
    }

    // Use a compatible API version and specify it explicitly
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
      typescript: true,
    });

    return this.stripe;
  }

  /**
   * Calculate the price for purchasing credits based on subscription tier
   */
  static calculateCreditPrice(amount: number, tier: PlanTier): number {
    // Get the appropriate top-up rate based on the subscription tier
    let topUpRate = 0;
    
    if (tier === 'pro') {
      topUpRate = PLANS.PRO.topUpRate || 15;
    } else if (tier === 'ultra') {
      topUpRate = PLANS.ULTRA.topUpRate || 30;
    } else {
      // Free tier cannot purchase credits
      return 0;
    }
    
    // Calculate the price - $1 per X credits, rounded up to nearest dollar
    const price = Math.ceil(amount / topUpRate);
    
    return price;
  }

  /**
   * Create or retrieve a Stripe customer
   */
  static async createOrRetrieveCustomer(email: string, userId: string): Promise<string> {
    const stripe = this.getStripe();
    
    try {
      // First check if customer already exists for this user
      const existingCustomers = await stripe.customers.list({
        email,
        limit: 1,
      });
      
      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0].id;
      }
      
      // Create a new customer if none exists
      const newCustomer = await stripe.customers.create({
        email,
        metadata: {
          userId
        }
      });
      
      return newCustomer.id;
    } catch (error) {
      console.error('Error creating/retrieving customer:', error);
      throw new Error(`Failed to create/retrieve customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a subscription checkout session
   */
  static async createSubscriptionCheckout(customerId: string, tier: 'pro' | 'ultra', userId: string): Promise<{ url: string | null }> {
    try {
      const stripe = this.getStripe();
      
      // Get the appropriate price ID based on the tier
      const priceId = tier === 'pro' 
        ? process.env.STRIPE_PRO_PRICE_ID 
        : process.env.STRIPE_ULTRA_PRICE_ID;
      
      if (!priceId) {
        throw new Error(`Price ID not found for ${tier} tier`);
      }
      
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        // discounts: [{
        //   coupon: process.env.STRIPE_DISCOUNT_COUPON || 'jYKdD3MY',
        // }],
        mode: 'subscription',
        success_url: `${this.getSiteUrl()}/dashboard?checkout=success`,
        cancel_url: `${this.getSiteUrl()}/dashboard?checkout=cancelled`,
        metadata: {
          userId,
          tier,
        },
      });

      return { url: session.url };
    } catch (error) {
      console.error('Error creating subscription checkout:', error);
      throw new Error(`Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a credit purchase checkout session
   */
  static async createCreditPurchaseCheckout(
    customerId: string,
    amount: number,
    tier: PlanTier,
    userId: string
  ): Promise<{ url: string | null }> {
    if (tier === 'free') {
      throw new Error('Free tier users cannot purchase credits');
    }
    
    try {
      const stripe = this.getStripe();
      const price = this.calculateCreditPrice(amount, tier);
      
      if (price <= 0) {
        throw new Error('Invalid credit amount or pricing calculation');
      }
      
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${amount} AI Credits`,
                description: 'AI Credits for generating content',
              },
              unit_amount: price * 100, // Convert dollars to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${this.getSiteUrl()}/dashboard?checkout=success`,
        cancel_url: `${this.getSiteUrl()}/dashboard?checkout=cancelled`,
        metadata: {
          userId,
          isCreditPurchase: 'true',
          credits: amount.toString(),
          tier,
        },
      });

      return { url: session.url };
    } catch (error) {
      console.error('Error creating credit purchase checkout:', error);
      throw new Error(`Failed to create credits checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle the Stripe webhook event
   */
  static async handleWebhookEvent(
    body: string,
    signature: string,
    webhookSecret: string
  ): Promise<{ success: boolean; message: string }> {
    const stripe = this.getStripe();
    
    try {
      // Verify the event came from Stripe
      const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      
      console.log(`Processing webhook event: ${event.type}`);
      
      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as StripeSession);
          break;
          
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionChange(event.data.object as StripeSubscription);
          break;
          
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancelled(event.data.object as StripeSubscription);
          break;
          
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as StripeInvoice);
          break;
          
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as StripeInvoice);
          break;
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      return { success: true, message: `Processed ${event.type} event` };
    } catch (error) {
      console.error('Webhook error:', error);
      return { 
        success: false, 
        message: `Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Handle checkout session completed event
   */
  private static async handleCheckoutSessionCompleted(session: StripeSession) {
    const supabase = await AuthService.createServerClient() as SupabaseClient;
    const userId = session.metadata?.userId;
    
    if (!userId) {
      console.error('No user ID in session metadata');
      return;
    }
    
    // Check if this is a credit purchase
    if (session.metadata?.isCreditPurchase === 'true') {
      const credits = parseInt(session.metadata.credits, 10);
      
      if (isNaN(credits) || credits <= 0) {
        console.error('Invalid credit amount in metadata');
        return;
      }
      
      // Add credits to the user's account
      const { error } = await (supabase as any).rpc('add_user_credits', {
        p_user_id: userId,
        p_amount: credits,
      });
      
      if (error) {
        console.error('Error adding credits:', error);
        return;
      }
      
      // Record the credit purchase
      try {
        await (supabase as any).from('credit_purchases').insert({
          user_id: userId,
          amount: credits,
          cost: (session.amount_total || 0) / 100, // Convert cents to dollars
          currency: session.currency || 'usd',
          stripe_session_id: session.id
        });
      } catch (error) {
        console.error('Error recording credit purchase:', error);
      }
      
      console.log(`Added ${credits} credits to user ${userId}`);
    } else {
      // This is a subscription purchase, handled by subscription events
      console.log(`Subscription checkout completed for user ${userId}`);
    }
  }

  /**
   * Handle subscription change event
   */
  private static async handleSubscriptionChange(subscription: StripeSubscription) {
    const supabase = await AuthService.createServerClient();
    
    // Find the user ID from the customer metadata
    const customerId = subscription.customer;
    const stripe = this.getStripe();
    
    try {
      const customer = await stripe.customers.retrieve(customerId) as StripeCustomer;
      
      if (!customer || customer.deleted) {
        console.error('Customer not found or deleted');
        return;
      }
      
      const userId = customer.metadata?.userId;
      
      if (!userId) {
        console.error('No user ID in customer metadata');
        return;
      }
      
      // Determine the subscription tier from the product
      const productId = subscription.items.data[0]?.price.product;
      const product = await stripe.products.retrieve(productId as string);
      
      let tier = 'free';
      if (product.metadata?.tier) {
        tier = product.metadata.tier;
      } else if (productId === process.env.STRIPE_PRO_PRODUCT_ID) {
        tier = 'pro';
      } else if (productId === process.env.STRIPE_ULTRA_PRODUCT_ID) {
        tier = 'ultra';
      }
      
      // Update the user's subscription information
      try {
        const { error } = await (supabase as any).from('profiles')
          .update({
            stripe_customer_id: customerId,
            subscription_tier: tier,
            subscription_status: subscription.status,
            subscription_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            max_monthly_credits: tier === 'ultra' ? 1000 : tier === 'pro' ? 100 : 30,
          })
          .eq('id', userId);
        
        if (error) {
          console.error('Error updating profile:', error);
          return;
        }
      } catch (error) {
        console.error('Error updating profile:', error);
      }
      
      // Record in subscription history
      try {
        await (supabase as any).from('subscription_history').insert({
          user_id: userId,
          subscription_tier: tier,
          status: subscription.status,
          amount_paid: subscription.items.data[0]?.price.unit_amount ? subscription.items.data[0].price.unit_amount / 100 : null,
          currency: subscription.currency || 'usd',
          stripe_subscription_id: subscription.id
        });
      } catch (error) {
        console.error('Error recording subscription history:', error);
      }
      
      console.log(`Updated subscription for user ${userId} to ${tier} tier`);
    } catch (error) {
      console.error('Error processing subscription change:', error);
    }
  }

  /**
   * Handle subscription cancelled event
   */
  private static async handleSubscriptionCancelled(subscription: StripeSubscription) {
    const supabase = await AuthService.createServerClient();
    
    // Find the user ID from the customer metadata
    const customerId = subscription.customer;
    const stripe = this.getStripe();
    
    try {
      const customer = await stripe.customers.retrieve(customerId) as StripeCustomer;
      
      if (!customer || customer.deleted) {
        console.error('Customer not found or deleted');
        return;
      }
      
      const userId = customer.metadata?.userId;
      
      if (!userId) {
        console.error('No user ID in customer metadata');
        return;
      }
      
      // Update the user's subscription information to free tier
      try {
        const { error } = await (supabase as any).from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            max_monthly_credits: 30,
          })
          .eq('id', userId);
        
        if (error) {
          console.error('Error updating profile:', error);
          return;
        }
      } catch (error) {
        console.error('Error updating profile:', error);
      }
      
      // Record in subscription history
      try {
        await (supabase as any).from('subscription_history').insert({
          user_id: userId,
          subscription_tier: 'free',
          status: 'canceled',
          currency: subscription.currency || 'usd',
          stripe_subscription_id: subscription.id
        });
      } catch (error) {
        console.error('Error recording subscription history:', error);
      }
      
      console.log(`Cancelled subscription for user ${userId}`);
    } catch (error) {
      console.error('Error processing subscription cancellation:', error);
    }
  }

  /**
   * Handle invoice payment succeeded event
   */
  private static async handleInvoicePaymentSucceeded(invoice: StripeInvoice) {
    // This could be used for tracking successful payments or adding credits for renewals
    console.log(`Invoice payment succeeded: ${invoice.id}`);
  }

  /**
   * Handle invoice payment failed event
   */
  private static async handleInvoicePaymentFailed(invoice: StripeInvoice) {
    const supabase = await AuthService.createServerClient();
    
    // Find the user ID from the customer metadata
    const customerId = invoice.customer;
    const stripe = this.getStripe();
    
    try {
      const customer = await stripe.customers.retrieve(customerId) as StripeCustomer;
      
      if (!customer || customer.deleted) {
        console.error('Customer not found or deleted');
        return;
      }
      
      const userId = customer.metadata?.userId;
      
      if (!userId) {
        console.error('No user ID in customer metadata');
        return;
      }
      
      // Update the user's subscription information to reflect the failed payment
      try {
        const { error } = await (supabase as any).from('profiles')
          .update({
            subscription_status: 'past_due',
          })
          .eq('id', userId);
        
        if (error) {
          console.error('Error updating profile:', error);
          return;
        }
      } catch (error) {
        console.error('Error updating profile:', error);
      }
      
      console.log(`Invoice payment failed for user ${userId}`);
    } catch (error) {
      console.error('Error processing invoice payment failure:', error);
    }
  }

  /**
   * Get the site URL based on environment
   */
  private static getSiteUrl(): string {
    return process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.NEXT_PUBLIC_VERCEL_URL ? 
        `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 
        'http://localhost:3000');
  }

  /**
   * Cancel a user's subscription
   */
  static async cancelSubscription(userId: string): Promise<{ success: boolean; message: string }> {
    const supabase = await AuthService.createServerClient();
    
    try {
      // Get the user's profile to find their Stripe customer ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('stripe_customer_id, subscription_tier')
        .eq('id', userId)
        .single();
      
      if (profileError || !profile) {
        throw new Error('User profile not found');
      }
      
      if (!profile.stripe_customer_id || profile.subscription_tier === 'free') {
        throw new Error('No active subscription to cancel');
      }
      
      const stripe = this.getStripe();
      
      // Find the subscription ID
      const subscriptions = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: 'active',
        limit: 1,
      });
      
      if (subscriptions.data.length === 0) {
        throw new Error('No active subscription found');
      }
      
      // Cancel the subscription
      await stripe.subscriptions.cancel(subscriptions.data[0].id);
      
      // Update the profile immediately
      try {
        await (supabase as any).from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            max_monthly_credits: 30,
          })
          .eq('id', userId);
      } catch (error) {
        console.error('Error updating profile after cancellation:', error);
      }
      
      // Add to subscription history
      try {
        await (supabase as any).from('subscription_history').insert({
          user_id: userId,
          subscription_tier: 'free',
          status: 'canceled',
          stripe_subscription_id: subscriptions.data[0].id
        });
      } catch (error) {
        console.error('Error recording subscription cancellation history:', error);
      }
      
      return { 
        success: true, 
        message: 'Subscription successfully cancelled. Your account has been downgraded to the free tier.'
      };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return { 
        success: false, 
        message: `Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Export for convenience
export const getStripe = PaymentService.getStripe.bind(PaymentService);
export const createSubscriptionCheckout = PaymentService.createSubscriptionCheckout.bind(PaymentService);
export const createCreditPurchaseCheckout = PaymentService.createCreditPurchaseCheckout.bind(PaymentService);
export const calculateCreditPrice = PaymentService.calculateCreditPrice.bind(PaymentService);
export const createOrRetrieveCustomer = PaymentService.createOrRetrieveCustomer.bind(PaymentService);
export const cancelSubscription = PaymentService.cancelSubscription.bind(PaymentService);
export const handleWebhookEvent = PaymentService.handleWebhookEvent.bind(PaymentService); 