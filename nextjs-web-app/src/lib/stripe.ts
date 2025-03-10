import Stripe from 'stripe';

// Initialize Stripe with the API secret key
let stripe: Stripe | null = null;

// Subscription plan configuration
export const PLANS = {
  FREE: {
    name: 'Free',
    credits: 30,
    price: 0,
    features: ['30 free credits per day', 'Max 3x generations'],
  },
  PRO: {
    name: 'Pro',
    credits: 100,
    price: 10,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: ['100 free credits per day', 'Ability to use smarter models', 'Ability to configure vibes', 'Buy additional credits: $1 = 15 credits'],
    topUpRate: 15, // Credits per $1
  },
  ULTRA: {
    name: 'Ultra',
    credits: 1000,
    price: 50,
    priceId: process.env.STRIPE_ULTRA_PRICE_ID,
    features: ['1000 free credits per day', 'Everything from other plans', 'Priority support', 'Buy additional credits: $1 = 30 credits', 'Generations can be saved (coming soon)'],
    topUpRate: 30, // Credits per $1
  },
};

// Initialize Stripe only on the server side
function getStripe() {
  if (stripe) return stripe;
  
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not defined');
  }
  
  stripe = new Stripe(stripeSecretKey);
  return stripe;
}

// Helper function to create a checkout session
export async function createCheckoutSession(customerId: string, priceId: string, userId: string): Promise<{ url: string | null }> {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000')}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000')}/dashboard?checkout=cancelled`,
      metadata: {
        userId,
      },
    });

    return { url: session.url };
  } catch (error) {
    throw new Error(`Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to create or retrieve a Stripe customer
export async function getOrCreateCustomer(email: string, userId: string): Promise<string> {
  try {
    // Validate email
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address provided');
    }
    
    const stripe = getStripe();
    // Search for an existing customer with the user's email
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    // If a customer exists, return their ID
    if (customers.data.length > 0) {
      return customers.data[0].id;
    }

    // Otherwise, create a new customer
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    });

    return customer.id;
  } catch (error) {
    throw new Error(`Failed to get or create customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to cancel a subscription
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  try {
    const stripe = getStripe();
    await stripe.subscriptions.cancel(subscriptionId);
  } catch (error) {
    throw new Error(`Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to get subscription details
export async function retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    const stripe = getStripe();
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    throw new Error(`Failed to retrieve subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to calculate the price for credit purchases
function calculateCreditPrice(amount: number): number {
  // Simple pricing model: $1 per credit with volume discount
  let price = amount;
  if (amount >= 100) {
    // 10% discount for 100+ credits
    price = amount * 0.9;
  } else if (amount >= 50) {
    // 5% discount for 50+ credits
    price = amount * 0.95;
  }
  return price;
}

// Helper function to create a checkout session for a one-time purchase of credits
export async function createCreditCheckoutSession(
  customerId: string,
  amount: number,
  userId: string
): Promise<{ url: string | null }> {
  try {
    const stripe = getStripe();
    
    // Create a Stripe checkout session for the credit purchase
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
            unit_amount: calculateCreditPrice(amount) * 100, // Convert dollars to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000')}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000')}/dashboard?checkout=cancelled`,
      metadata: {
        userId,
        isCreditPurchase: 'true',
        credits: amount.toString(),
      },
    });

    return { url: session.url };
  } catch (error) {
    throw new Error(`Failed to create credits checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Export aliases for backward compatibility
export const createOrRetrieveCustomer = getOrCreateCustomer;
export const createCreditsCheckoutSession = createCreditCheckoutSession;
export const getSubscription = retrieveSubscription;

export default { 
  getStripe,
  webhooks: {
    constructEvent: (payload: string, signature: string, secret: string) => {
      const stripe = getStripe();
      return stripe.webhooks.constructEvent(payload, signature, secret);
    }
  },
  customers: {
    retrieve: (id: string) => {
      const stripe = getStripe();
      return stripe.customers.retrieve(id);
    },
    list: (params: Stripe.CustomerListParams) => {
      const stripe = getStripe();
      return stripe.customers.list(params);
    },
    create: (params: Stripe.CustomerCreateParams) => {
      const stripe = getStripe();
      return stripe.customers.create(params);
    }
  },
  subscriptions: {
    retrieve: (id: string) => {
      const stripe = getStripe();
      return stripe.subscriptions.retrieve(id);
    },
    cancel: (id: string) => {
      const stripe = getStripe();
      return stripe.subscriptions.cancel(id);
    }
  },
  checkout: {
    sessions: {
      create: (params: Stripe.Checkout.SessionCreateParams) => {
        const stripe = getStripe();
        return stripe.checkout.sessions.create(params);
      }
    }
  }
}; 