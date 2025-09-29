'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FaCrown, FaTimes, FaCheck } from 'react-icons/fa'
import { getStripe } from '@/lib/stripe-client'

// Define subscription plans locally to avoid server-side imports
const SUBSCRIPTION_PLANS = {
  PRO: {
    name: 'Pro',
    price: 20,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY || '',
    features: [
      'Unlimited app generations',
      'Premium templates',
      'Priority support',
      'Advanced customization',
      'Export to GitHub',
      'Custom domains'
    ]
  }
}

interface UpgradePromptProps {
  isOpen: boolean
  onClose: () => void
  reason?: string
}

export default function UpgradePrompt({ isOpen, onClose, reason }: UpgradePromptProps) {
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleUpgrade = async () => {
    try {
      setLoading(true)
      
      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: SUBSCRIPTION_PLANS.PRO.priceId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { sessionId } = await response.json()
      
      // Redirect to Stripe Checkout
      const stripe = await getStripe()
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      const { error } = await stripe.redirectToCheckout({ sessionId })
      
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error)
      alert('Failed to start upgrade process. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FaCrown className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Upgrade to Pro
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        {reason && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {reason}
            </p>
          </div>
        )}

        <div className="mb-6">
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              ${SUBSCRIPTION_PLANS.PRO.price}
              <span className="text-lg font-normal text-gray-600 dark:text-gray-400">
                /month
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {SUBSCRIPTION_PLANS.PRO.features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-3">
                <FaCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <FaCrown className="h-4 w-4" />
                <span>Upgrade Now</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
          Cancel anytime. No hidden fees.
        </p>
      </motion.div>
    </motion.div>
  )
}
