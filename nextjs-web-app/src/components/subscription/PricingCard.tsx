'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FaCheck, FaCrown } from 'react-icons/fa'
import { stripePromise } from '@/lib/stripe-client'

interface PricingCardProps {
  plan: {
    name: string
    price: number
    priceId?: string
    features: string[]
    limits: {
      dailyGenerations: number
      maxAppsStored: number
    }
  }
  isCurrentPlan?: boolean
  isPopular?: boolean
}

export default function PricingCard({ plan, isCurrentPlan, isPopular }: PricingCardProps) {
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    if (!plan.priceId || isCurrentPlan) return

    try {
      setLoading(true)
      
      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.priceId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { sessionId } = await response.json()
      
      // Redirect to Stripe Checkout
      const stripe = await stripePromise
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      const { error } = await stripe.redirectToCheckout({ sessionId })
      
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error starting subscription:', error)
      alert('Failed to start subscription process. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isFree = plan.price === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
        isPopular 
          ? 'border-indigo-500 dark:border-indigo-400' 
          : 'border-gray-200 dark:border-gray-700'
      } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="bg-indigo-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
            <FaCrown className="h-3 w-3" />
            <span>Most Popular</span>
          </div>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3 right-4">
          <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Current Plan
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {plan.name}
          </h3>
          <div className="text-4xl font-bold text-gray-900 dark:text-white">
            ${plan.price}
            {!isFree && (
              <span className="text-lg font-normal text-gray-600 dark:text-gray-400">
                /month
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-start space-x-3">
              <FaCheck className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {feature}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Daily Generations:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {plan.limits.dailyGenerations === -1 ? 'Unlimited' : plan.limits.dailyGenerations}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Stored Apps:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {plan.limits.maxAppsStored === -1 ? 'Unlimited' : plan.limits.maxAppsStored}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={loading || isCurrentPlan || isFree}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            isCurrentPlan
              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 cursor-default'
              : isFree
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-default'
              : loading
              ? 'bg-indigo-400 text-white cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processing...</span>
            </div>
          ) : isCurrentPlan ? (
            'Current Plan'
          ) : isFree ? (
            'Free Forever'
          ) : (
            `Subscribe to ${plan.name}`
          )}
        </button>

        {!isFree && !isCurrentPlan && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Cancel anytime. No hidden fees.
          </p>
        )}
      </div>
    </motion.div>
  )
}
