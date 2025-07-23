'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaCrown, FaExclamationTriangle, FaCog } from 'react-icons/fa'

interface SubscriptionData {
  subscription_status: 'free' | 'active' | 'canceled' | 'past_due' | 'unpaid'
  subscription_plan: 'free' | 'pro'
  daily_generations_used: number
  daily_generations_reset_date: string
  subscription?: {
    current_period_end: string
    cancel_at_period_end: boolean
    status: string
  }
}

export default function SubscriptionStatus() {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSubscriptionStatus()
  }, [])

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/stripe/subscription-status')
      if (!response.ok) {
        throw new Error('Failed to fetch subscription status')
      }
      const data = await response.json()
      setSubscriptionData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }
      
      const { url } = await response.json()
      window.location.href = url
    } catch (err) {
      console.error('Error opening customer portal:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
      </div>
    )
  }

  if (error || !subscriptionData) {
    return (
      <div className="text-sm text-red-600 dark:text-red-400">
        Error loading subscription status
      </div>
    )
  }

  const { subscription_status, subscription_plan, daily_generations_used } = subscriptionData
  const isPro = subscription_plan === 'pro' && subscription_status === 'active'
  const dailyLimit = isPro ? -1 : 3 // -1 means unlimited

  const getStatusColor = () => {
    switch (subscription_status) {
      case 'active':
        return 'text-green-600 dark:text-green-400'
      case 'past_due':
      case 'unpaid':
        return 'text-red-600 dark:text-red-400'
      case 'canceled':
        return 'text-yellow-600 dark:text-yellow-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getStatusIcon = () => {
    if (isPro) {
      return <FaCrown className="h-4 w-4 text-yellow-500" />
    }
    if (subscription_status === 'past_due' || subscription_status === 'unpaid') {
      return <FaExclamationTriangle className="h-4 w-4 text-red-500" />
    }
    return null
  }

  const getStatusText = () => {
    if (isPro) return 'Pro'
    if (subscription_status === 'past_due') return 'Payment Due'
    if (subscription_status === 'unpaid') return 'Payment Failed'
    if (subscription_status === 'canceled') return 'Canceled'
    return 'Free'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
        
        {subscription_status !== 'free' && (
          <button
            onClick={handleManageSubscription}
            className="flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            <FaCog className="h-3 w-3" />
            <span>Manage</span>
          </button>
        )}
      </div>

      {/* Usage Information */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Daily Generations
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {isPro ? 'Unlimited' : `${daily_generations_used}/${dailyLimit}`}
          </span>
        </div>

        {!isPro && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min((daily_generations_used / dailyLimit) * 100, 100)}%`
              }}
            />
          </div>
        )}

        {subscription_status === 'past_due' && (
          <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">
              Your payment is past due. Please update your payment method to continue using Pro features.
            </p>
          </div>
        )}

        {subscriptionData.subscription?.cancel_at_period_end && (
          <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Your subscription will end on{' '}
              {new Date(subscriptionData.subscription.current_period_end).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
