'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FaCheck, FaCrown, FaCoins } from 'react-icons/fa'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface TokenPackageCardProps {
  package: {
    name: string
    tokens: number
    price: number
    description: string
    features: string[]
    popular: boolean
  }
  isPopular?: boolean
}

export default function TokenPackageCard({ package: tokenPackage, isPopular }: TokenPackageCardProps) {
  const [loading, setLoading] = useState(false)

  const handlePurchase = async () => {
    try {
      setLoading(true)
      
      // Create payment intent
      const response = await fetch('/api/tokens/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageType: tokenPackage.name.toLowerCase().includes('starter') ? 'starter' :
                      tokenPackage.name.toLowerCase().includes('popular') ? 'popular' : 'premium',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create payment intent')
      }

      const { clientSecret } = await response.json()
      
      // Redirect to Stripe payment page
      const stripe = await stripePromise
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      const { error } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard?payment=success`,
        },
      })
      
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error purchasing tokens:', error)
      alert('Failed to purchase tokens. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const pricePerToken = (tokenPackage.price / tokenPackage.tokens).toFixed(3)

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 transition-all duration-300 ${
        isPopular || tokenPackage.popular
          ? 'border-blue-500 ring-4 ring-blue-500/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
      }`}
    >
      {/* Popular Badge */}
      {(isPopular || tokenPackage.popular) && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
            <FaCrown className="w-4 h-4" />
            Most Popular
          </div>
        </div>
      )}

      <div className="p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <FaCoins className="w-8 h-8 text-yellow-500 mr-2" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {tokenPackage.name}
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {tokenPackage.description}
          </p>
          <div className="flex items-baseline justify-center">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">
              ${tokenPackage.price}
            </span>
            <span className="text-lg text-gray-600 dark:text-gray-400 ml-2">
              for {tokenPackage.tokens} tokens
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            ${pricePerToken} per token
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-8">
          {tokenPackage.features.map((feature, index) => (
            <div key={index} className="flex items-center">
              <FaCheck className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300">{feature}</span>
            </div>
          ))}
        </div>

        {/* Purchase Button */}
        <button
          onClick={handlePurchase}
          disabled={loading}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
            isPopular || tokenPackage.popular
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            `Purchase ${tokenPackage.tokens} Tokens`
          )}
        </button>

        {/* Value Proposition */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Generate {tokenPackage.tokens} apps • No expiration • One-time payment
          </p>
        </div>
      </div>
    </motion.div>
  )
}
