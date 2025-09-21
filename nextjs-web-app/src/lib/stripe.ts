import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

// Stripe configuration constants
export const STRIPE_CONFIG = {
  PRICE_ID_MONTHLY: process.env.STRIPE_PRICE_ID_MONTHLY || '',
  PRODUCT_ID: process.env.STRIPE_PRODUCT_ID || '',
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
} as const

// Subscription plan configuration
export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    features: [
      'Generate up to 3 apps per day',
      'Basic templates',
      'Community support'
    ],
    limits: {
      dailyGenerations: 3,
      maxAppsStored: 5
    }
  },
  PRO: {
    name: 'Pro',
    price: 20,
    priceId: STRIPE_CONFIG.PRICE_ID_MONTHLY,
    features: [
      'Unlimited app generations',
      'Premium templates',
      'Priority support',
      'Advanced customization',
      'Export to GitHub',
      'Custom domains'
    ],
    limits: {
      dailyGenerations: -1, // unlimited
      maxAppsStored: -1 // unlimited
    }
  }
} as const

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS
