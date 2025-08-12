'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import UserProfile from '@/components/auth/UserProfile'
import TokenStatus from '@/components/tokens/TokenStatus'
import { useTokens } from '@/hooks/useTokens'

function DashboardContent() {
  const { theme } = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { tokenData, refreshTokens } = useTokens()

  useEffect(() => {
    // Check if we're returning from a successful token purchase
    const paymentStatus = searchParams.get('payment')
    if (paymentStatus === 'success') {
      // Refresh token data after successful payment
      setTimeout(() => {
        refreshTokens()
      }, 2000) // Give Stripe webhook time to process

      // Clean up URL
      router.replace('/dashboard')
    }
  }, [searchParams, refreshTokens, router])

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
                Manage your account and tokens
              </p>
            </div>
            <UserProfile />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Token Status */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Token Balance
                </h2>
                <TokenStatus />
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
                      Buy More Tokens
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Purchase token packages
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
                {/* Token Balance */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Available Tokens
                    </h3>
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {tokenData?.tokenBalance || 0}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Cost per generation</span>
                      <span className="text-gray-900 dark:text-white">
                        1 token
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Apps you can generate</span>
                      <span className="text-gray-900 dark:text-white">
                        {tokenData?.tokenBalance || 0}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Tokens never expire
                    </p>
                  </div>

                  {(tokenData?.tokenBalance || 0) === 0 && (
                    <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Out of tokens! Purchase more to continue generating apps.
                      </p>
                    </div>
                  )}
                </div>

                {/* Account Info */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                    Account Information
                  </h3>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {tokenData?.email || 'Loading...'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Payment Model</span>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        Pay-per-use
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Token Expiry</span>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        Never
                      </span>
                    </div>

                    {(tokenData?.tokenBalance || 0) === 0 && (
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => router.push('/pricing')}
                          className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Buy Tokens
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

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
