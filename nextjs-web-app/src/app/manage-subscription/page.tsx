'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import { useSubscription } from '@/hooks/useSubscription'

export default function ManageSubscriptionPage() {
  const { theme } = useTheme()
  const router = useRouter()
  const { subscriptionData, loading, error } = useSubscription()
  const [portalLoading, setPortalLoading] = useState(false)

  const handleManageSubscription = async () => {
    setPortalLoading(true)
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create portal session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Error opening customer portal:', error)
      alert('Unable to open customer portal. Please contact support.')
    } finally {
      setPortalLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p>Loading subscription details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${
      theme === 'dark' 
        ? 'bg-gray-900 text-white' 
        : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Manage Subscription
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View and manage your subscription details
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Current Plan */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Current Plan
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 capitalize">
                    {subscriptionData?.subscription_plan || 'Free'}
                  </span>
                  {subscriptionData?.subscription_plan === 'pro' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {subscriptionData?.subscription_plan === 'pro' 
                    ? 'Unlimited app generations' 
                    : '3 app generations per day'
                  }
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Usage Today
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {subscriptionData?.subscription_plan === 'pro' 
                    ? '✨ Unlimited generations'
                    : `${subscriptionData?.daily_generations_used || 0}/3 generations used`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Subscription Details */}
          {subscriptionData?.subscription && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Subscription Details
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {subscriptionData.subscription.status}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Next billing date</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(subscriptionData.subscription.current_period_end).toLocaleDateString()}
                  </span>
                </div>
                
                {subscriptionData.subscription.cancel_at_period_end && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Cancellation</span>
                    <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                      Will cancel at period end
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Manage Subscription
            </h2>
            
            <div className="space-y-4">
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors"
              >
                {portalLoading ? 'Opening...' : 'Open Customer Portal'}
              </button>
              
              <p className="text-sm text-gray-600 dark:text-gray-400">
                The customer portal allows you to update payment methods, view invoices, and manage your subscription.
              </p>

              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Note: Customer portal is not yet configured. Please contact support for subscription changes.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upgrade Option for Free Users */}
          {subscriptionData?.subscription_plan === 'free' && (
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
              <h2 className="text-lg font-semibold mb-2">
                Upgrade to Pro
              </h2>
              <p className="text-indigo-100 mb-4">
                Get unlimited app generations and priority support
              </p>
              <button
                onClick={() => router.push('/pricing')}
                className="px-6 py-2 bg-white text-indigo-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                View Pricing
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
