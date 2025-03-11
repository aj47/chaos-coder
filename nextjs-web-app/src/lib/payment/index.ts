import Stripe from 'stripe';
import { z } from 'zod';
import { AuthService } from '@/lib/auth';

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
  metadata?: Record<string, string>;
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
    console.log(`🔄 Creating subscription checkout for customer ${customerId}, tier: ${tier}`);
    
    try {
      const stripe = this.getStripe();
      
      // Get the appropriate price ID based on the tier
      const priceId = tier === 'pro' 
        ? process.env.STRIPE_PRO_PRICE_ID 
        : process.env.STRIPE_ULTRA_PRICE_ID;
      
      if (!priceId) {
        throw new Error(`Price ID not found for ${tier} tier`);
      }
      
      // Get the product ID for this price to include in metadata
      let productId = '';
      try {
        const price = await stripe.prices.retrieve(priceId);
        productId = price.product as string;
        console.log(`📊 Retrieved product ID for ${tier} tier: ${productId}`);
      } catch (error) {
        console.warn(`⚠️ Could not retrieve product ID for price ${priceId}:`, error);
      }
      
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${this.getSiteUrl()}/dashboard?checkout=success`,
        cancel_url: `${this.getSiteUrl()}/dashboard?checkout=cancelled`,
        metadata: {
          userId,
          tier,
          productId,
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
      
      console.log(`🔔 Processing webhook event: ${event.type}`);
      console.log(`📊 Event ID: ${event.id}`);
      
      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          console.log(`🔄 Handling checkout.session.completed event`);
          await this.handleCheckoutSessionCompleted(event.data.object as StripeSession);
          break;
          
        case 'customer.subscription.created':
          console.log(`🔄 Handling customer.subscription.created event`);
          await this.handleSubscriptionChange(event.data.object as StripeSubscription);
          break;
          
        case 'customer.subscription.updated':
          console.log(`🔄 Handling customer.subscription.updated event`);
          await this.handleSubscriptionChange(event.data.object as StripeSubscription);
          break;
          
        case 'customer.subscription.deleted':
          console.log(`🔄 Handling customer.subscription.deleted event`);
          await this.handleSubscriptionCancelled(event.data.object as StripeSubscription);
          break;
          
        case 'invoice.payment_succeeded':
          console.log(`🔄 Handling invoice.payment_succeeded event`);
          await this.handleInvoicePaymentSucceeded(event.data.object as StripeInvoice);
          break;
          
        case 'invoice.payment_failed':
          console.log(`🔄 Handling invoice.payment_failed event`);
          await this.handleInvoicePaymentFailed(event.data.object as StripeInvoice);
          break;
          
        default:
          console.log(`⚠️ Unhandled event type: ${event.type}`);
      }
      
      return { success: true, message: `Processed ${event.type} event` };
    } catch (error) {
      console.error('❌ Webhook error:', error);
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
    console.log(`🔄 Processing checkout session completed: ${session.id}`);
    console.log(`📊 Session metadata:`, session.metadata);
    
    // If this is a credit purchase, add credits to the user's account
    if (session.metadata?.credits && session.metadata?.userId) {
      const credits = parseInt(session.metadata.credits, 10);
      const userId = session.metadata.userId;
      
      console.log(`🔄 Adding ${credits} credits to user ${userId}`);
      
      const supabase = await AuthService.createServerClient();
      
      // Add credits to the user's account
      const { error } = await (supabase as any).rpc('add_user_credits', {
        p_user_id: userId,
        p_amount: credits,
      });
      
      if (error) {
        console.error('❌ Error adding credits:', error);
        return;
      }
      
      console.log(`✅ Successfully added ${credits} credits to user ${userId}`);
      
      // Record the purchase in the credit_purchases table
      try {
        const stripe = this.getStripe();
        const customer = await stripe.customers.retrieve(session.customer as string) as StripeCustomer;
        
        // Get the user's current tier
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', userId)
          .single();
          
        const tier = profile?.subscription_tier || 'free';
        
        await supabase
          .from('credit_purchases')
          .insert({
            user_id: userId,
            amount: credits,
            price_paid: (session.amount_total || 0) / 100, // Convert from cents to dollars
            currency: session.currency || 'usd',
            stripe_session_id: session.id,
            tier: tier,
          });
          
        console.log(`✅ Successfully recorded credit purchase for user ${userId}`);
      } catch (error) {
        console.error('❌ Error recording credit purchase:', error);
      }
    } else {
      console.log(`📊 Session does not contain credit purchase information`);
      
      // Check if this is a subscription checkout
      if (session.metadata?.tier && session.metadata?.userId) {
        console.log(`📊 Session contains subscription information: tier=${session.metadata.tier}, userId=${session.metadata.userId}`);
        console.log(`📊 Additional metadata:`, session.metadata);
        
        // The subscription will be handled by the subscription.created webhook
        console.log(`ℹ️ Subscription will be handled by the subscription.created webhook`);
        
        // If there's a subscription ID, update its metadata with the user ID
        if (session.subscription) {
          try {
            console.log(`🔄 Updating subscription metadata with user ID...`);
            const stripe = this.getStripe();
            
            await stripe.subscriptions.update(session.subscription, {
              metadata: {
                userId: session.metadata.userId,
                tier: session.metadata.tier,
                productId: session.metadata.productId
              }
            });
            
            console.log(`✅ Successfully updated subscription metadata with user ID: ${session.metadata.userId}`);
          } catch (error) {
            console.error('❌ Error updating subscription metadata:', error);
          }
        }
      } else {
        console.log(`⚠️ Session does not contain subscription information`);
        console.log(`📊 Session metadata:`, session.metadata);
      }
    }
  }

  /**
   * Handle subscription change event
   */
  private static async handleSubscriptionChange(subscription: StripeSubscription) {
    console.log(`🔄 Processing subscription change for subscription: ${subscription.id}`);
    console.log(`📊 Subscription status: ${subscription.status}`);
    console.log(`📊 Full subscription data:`, JSON.stringify(subscription, null, 2));
    
    const supabase = await AuthService.createServerClient();
    
    // Find the user ID from the customer metadata
    const customerId = subscription.customer;
    console.log(`📊 Customer ID: ${customerId}`);
    
    const stripe = this.getStripe();
    
    try {
      // First try to get the user ID from the subscription metadata
      let userId = subscription.metadata?.userId;
      
      if (userId) {
        console.log(`✅ User ID found in subscription metadata: ${userId}`);
      } else {
        // Fall back to getting it from the customer metadata
        const customer = await stripe.customers.retrieve(customerId) as StripeCustomer;
        
        if (!customer || customer.deleted) {
          console.error('❌ Customer not found or deleted');
          return;
        }
        
        userId = customer.metadata?.userId;
        
        if (!userId) {
          console.error('❌ No user ID in customer metadata');
          console.log(`📊 Customer metadata:`, customer.metadata);
          return;
        }
        
        console.log(`✅ User ID found in customer metadata: ${userId}`);
      }
      
      // First, check the current profile state
      try {
        console.log(`🔍 Checking current profile state for user ${userId}`);
        const { data: currentProfile, error: currentProfileError } = await (supabase as any)
          .from('profiles')
          .select('subscription_tier, subscription_status, credits')
          .eq('id', userId)
          .single();
          
        if (currentProfileError) {
          console.error('❌ Error fetching current profile:', currentProfileError);
        } else {
          console.log(`📊 Current profile state:`, currentProfile);
        }
      } catch (error) {
        console.error('❌ Error checking current profile:', error);
      }
      
      // Determine the subscription tier from the product
      const productId = subscription.items.data[0]?.price.product;
      console.log(`📊 Product ID from subscription: ${productId}`);
      console.log(`📊 Environment variables for product IDs:
        - STRIPE_PRO_PRODUCT_ID: ${process.env.STRIPE_PRO_PRODUCT_ID || 'Not set'}
        - STRIPE_ULTRA_PRODUCT_ID: ${process.env.STRIPE_ULTRA_PRODUCT_ID || 'Not set'}
      `);
      
      const product = await stripe.products.retrieve(productId as string);
      console.log(`📊 Product details:`, {
        name: product.name,
        metadata: product.metadata
      });
      
      // Determine tier from product metadata, environment variables, or product name
      let tier = 'free';
      
      // First try to get tier from product metadata
      if (product.metadata?.tier) {
        tier = product.metadata.tier;
        console.log(`📊 Tier from product metadata: ${tier}`);
      } 
      // Then try to match against environment variables
      else if (productId === process.env.STRIPE_PRO_PRODUCT_ID) {
        tier = 'pro';
        console.log(`📊 Tier matched to PRO product ID`);
      } else if (productId === process.env.STRIPE_ULTRA_PRODUCT_ID) {
        tier = 'ultra';
        console.log(`📊 Tier matched to ULTRA product ID`);
      } 
      // If that fails, try to determine from product name
      else if (product.name) {
        const productName = product.name.toLowerCase();
        if (productName.includes('pro')) {
          tier = 'pro';
          console.log(`📊 Tier determined from product name '${product.name}': pro`);
        } else if (productName.includes('ultra')) {
          tier = 'ultra';
          console.log(`📊 Tier determined from product name '${product.name}': ultra`);
        } else {
          console.log(`⚠️ Could not determine tier from product name: ${product.name}. Using default: ${tier}`);
        }
      } else {
        console.log(`⚠️ Could not determine tier from product. Using default: ${tier}`);
        console.log(`📊 Environment variables:
          - STRIPE_PRO_PRODUCT_ID: ${process.env.STRIPE_PRO_PRODUCT_ID ? 'Set' : 'Not set'}
          - STRIPE_ULTRA_PRODUCT_ID: ${process.env.STRIPE_ULTRA_PRODUCT_ID ? 'Set' : 'Not set'}
        `);
      }
      
      // Update the user's subscription information
      try {
        console.log(`🔄 Updating profile for user ${userId} with tier: ${tier}`);
        
        const profileData = {
          subscription_tier: tier,
          subscription_status: 'active',
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          subscription_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        };
        
        console.log(`📊 Update data:`, profileData);
        
        const { error } = await (supabase as any).from('profiles')
          .update(profileData)
          .eq('id', userId);
        
        if (error) {
          console.error('❌ Error updating profile:', error);
          return;
        }
        
        console.log(`✅ Successfully updated profile for user ${userId} to ${tier} tier`);
        
        // Verify the update was successful
        try {
          console.log(`🔍 Verifying profile update for user ${userId}`);
          const { data: updatedProfile, error: verifyError } = await (supabase as any)
            .from('profiles')
            .select('subscription_tier, subscription_status')
            .eq('id', userId)
            .single();
            
          if (verifyError) {
            console.error('❌ Error verifying profile update:', verifyError);
          } else {
            console.log(`📊 Updated profile state:`, updatedProfile);
            if (updatedProfile.subscription_tier !== tier) {
              console.error(`❌ Profile update verification failed: expected tier ${tier}, got ${updatedProfile.subscription_tier}`);
            } else {
              console.log(`✅ Profile update verification successful: tier is now ${updatedProfile.subscription_tier}`);
            }
          }
        } catch (verifyError) {
          console.error('❌ Exception during profile update verification:', verifyError);
        }
        
        // Record in subscription history
        try {
          console.log(`🔄 Recording subscription history for user ${userId}`);
          
          const historyData = {
            user_id: userId,
            subscription_tier: tier,
            status: subscription.status,
            amount_paid: subscription.items.data[0]?.price.unit_amount ? subscription.items.data[0].price.unit_amount / 100 : null,
            currency: subscription.currency || 'usd',
            stripe_subscription_id: subscription.id
          };
          
          console.log(`📊 Subscription history data:`, historyData);
          
          await (supabase as any).from('subscription_history').insert(historyData);
          
          console.log(`✅ Successfully recorded subscription history`);
        } catch (error) {
          console.error('❌ Error recording subscription history:', error);
        }
        
        console.log(`✅ Completed subscription update for user ${userId} to ${tier} tier`);
      } catch (error) {
        console.error('❌ Error updating profile:', error);
      }
    } catch (error) {
      console.error('❌ Error processing subscription change:', error);
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