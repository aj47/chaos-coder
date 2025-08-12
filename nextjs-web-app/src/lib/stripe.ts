import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
  typescript: true,
})

// Stripe configuration constants
export const STRIPE_CONFIG = {
  PRICE_ID_MONTHLY: process.env.STRIPE_PRICE_ID_MONTHLY || '',
  PRODUCT_ID: process.env.STRIPE_PRODUCT_ID || '',
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
} as const

// Token package configuration
export const TOKEN_PACKAGES = {
  STARTER: {
    name: 'Starter Pack',
    tokens: 100,
    price: 10,
    priceId: process.env.STRIPE_PRICE_ID_STARTER || '',
    description: 'Perfect for trying out the platform',
    features: [
      '100 app generations',
      'All templates included',
      'Community support'
    ],
    popular: false
  },
  POPULAR: {
    name: 'Popular Pack',
    tokens: 300,
    price: 20,
    priceId: process.env.STRIPE_PRICE_ID_POPULAR || '',
    description: 'Best value for regular users',
    features: [
      '300 app generations',
      'All templates included',
      'Priority support',
      'Advanced customization'
    ],
    popular: true
  },
  PREMIUM: {
    name: 'Premium Pack',
    tokens: 1000,
    price: 50,
    priceId: process.env.STRIPE_PRICE_ID_PREMIUM || '',
    description: 'For power users and teams',
    features: [
      '1000 app generations',
      'All templates included',
      'Priority support',
      'Advanced customization',
      'Export to GitHub',
      'Custom domains'
    ],
    popular: false
  }
} as const

export type TokenPackage = keyof typeof TOKEN_PACKAGES

// Helper function to get package details by type
export function getTokenPackage(packageType: string) {
  const upperType = packageType.toUpperCase() as TokenPackage
  return TOKEN_PACKAGES[upperType] || null
}
