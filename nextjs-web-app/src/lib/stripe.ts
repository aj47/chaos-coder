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
export async function createCheckoutSession(customerId: string, priceId: string, userId: string) {
  try {
    const stripe = getStripe();
    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      metadata: {
        userId,
      },
    });

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

// Helper function to create or retrieve a Stripe customer
export async function createOrRetrieveCustomer(email: string, userId: string) {
  try {
    const stripe = getStripe();
    // Search for an existing customer with the given email
    const customers = await stripe.customers.list({ email });

    if (customers.data.length > 0) {
      // Return the first customer with the given email
      return customers.data[0].id;
    }

    // Create a new customer if one doesn't exist
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    });

    return customer.id;
  } catch (error) {
    console.error('Error creating or retrieving customer:', error);
    throw error;
  }
}

// Helper function to cancel a subscription
export async function cancelSubscription(subscriptionId: string) {
  try {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
}

// Helper function to get subscription details
export async function getSubscription(subscriptionId: string) {
  try {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    throw error;
  }
}

// Helper function to create a checkout session for a one-time purchase of credits
export async function createCreditsCheckoutSession(customerId: string, userId: string, amount: number, planTier: string) {
  try {
    const stripe = getStripe();
    
    // Determine the appropriate unit amount based on the plan tier
    const plan = planTier.toUpperCase() === 'PRO' ? PLANS.PRO : PLANS.ULTRA;
    const creditsPerDollar = plan.topUpRate || 0;
    
    if (!creditsPerDollar) {
      throw new Error('Invalid plan tier or top-up rate not configured');
    }
    
    // Calculate how many credits they'll receive
    const creditsToAdd = amount * creditsPerDollar;
    
    // Create a Stripe checkout session for a one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${creditsToAdd} Additional Credits`,
              description: `Purchase ${creditsToAdd} additional credits for your ${planTier} plan`,
            },
            unit_amount: amount * 100, // amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // one-time payment
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?credits_purchased=true&amount=${creditsToAdd}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      metadata: {
        userId,
        creditsToAdd,
        purchaseType: 'credits',
      },
    });

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    console.error('Error creating credits checkout session:', error);
    throw error;
  }
}

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