'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import UserProfile from '@/components/auth/UserProfile'
import SubscriptionStatus from '@/components/subscription/SubscriptionStatus'
import { useSubscription } from '@/hooks/useSubscription'

export default function DashboardPage() {
  const { theme } = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { subscriptionData, refreshSubscription } = useSubscription()

  useEffect(() => {
    // Check if we're returning from a successful Stripe checkout
    const sessionId = searchParams.get('session_id')
    if (sessionId) {
      // Refresh subscription data after successful checkout
      setTimeout(() => {
        refreshSubscription()
      }, 2000) // Give Stripe webhook time to process
      
      // Clean up URL
      router.replace('/dashboard')
    }
  }, [searchParams, refreshSubscription, router])

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
                Dashboard
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage your account and subscription
              </p>
            </div>
            <UserProfile />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Subscription Status */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Subscription Status
                </h2>
                <SubscriptionStatus />
              </div>

              {/* Quick Actions */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h2>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/')}
                    className="w-full text-left px-4 py-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      Generate New App
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Create a new web application
                    </div>
                  </button>
                  
                  <button
                    onClick={() => router.push('/pricing')}
                    className="w-full text-left px-4 py-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      View Pricing
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Compare plans and features
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Usage Statistics */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Usage Overview
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Daily Generations */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Daily Generations
                    </h3>
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {subscriptionData?.daily_generations_used || 0}
                    </div>
                  </div>
                  
                  {subscriptionData?.subscription_plan === 'free' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Used</span>
                        <span className="text-gray-900 dark:text-white">
                          {subscriptionData.daily_generations_used}/3
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min((subscriptionData.daily_generations_used / 3) * 100, 100)}%`
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Resets daily at midnight
                      </p>
                    </div>
                  )}
                  
                  {subscriptionData?.subscription_plan === 'pro' && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✨ Unlimited generations with Pro
                    </p>
                  )}
                </div>

                {/* Account Status */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                    Account Status
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Plan</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {subscriptionData?.subscription_plan || 'Free'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                      <span className={`text-sm font-medium capitalize ${
                        subscriptionData?.subscription_status === 'active' 
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {subscriptionData?.subscription_status || 'Free'}
                      </span>
                    </div>
                    
                    {subscriptionData?.subscription_plan === 'free' && (
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => router.push('/pricing')}
                          className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Upgrade to Pro
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
