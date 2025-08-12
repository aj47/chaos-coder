'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FaCoins, FaPlus, FaShoppingCart } from 'react-icons/fa'
import { useTokens } from '@/hooks/useTokens'

export default function TokenStatus() {
  const router = useRouter()
  const { tokenData, loading, error, refreshTokens } = useTokens()

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
        <div className="text-red-600 dark:text-red-400 text-sm">
          Error loading token balance: {error}
        </div>
        <button
          onClick={refreshTokens}
          className="mt-2 text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!tokenData) {
    return null
  }

  const { tokenBalance } = tokenData
  const isLowBalance = tokenBalance < 10
  const isOutOfTokens = tokenBalance === 0

  const getBalanceColor = () => {
    if (isOutOfTokens) return 'text-red-600 dark:text-red-400'
    if (isLowBalance) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  const getBalanceIcon = () => {
    return <FaCoins className="h-4 w-4 text-yellow-500" />
  }

  const handleBuyTokens = () => {
    router.push('/pricing')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getBalanceIcon()}
          <span className="font-medium text-gray-900 dark:text-white">
            Token Balance
          </span>
        </div>
        
        <button
          onClick={handleBuyTokens}
          className="flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          <FaPlus className="h-3 w-3" />
          <span>Buy More</span>
        </button>
      </div>

      {/* Token Balance Display */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {tokenBalance}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            tokens available
          </span>
        </div>

        {/* Status Messages */}
        {isOutOfTokens && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
            <div className="flex items-center space-x-2">
              <FaShoppingCart className="h-4 w-4 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                Out of tokens!
              </p>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              Purchase more tokens to continue generating apps.
            </p>
            <button
              onClick={handleBuyTokens}
              className="mt-2 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
            >
              Buy Tokens Now
            </button>
          </div>
        )}

        {isLowBalance && !isOutOfTokens && (
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center space-x-2">
              <FaCoins className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                Low token balance
              </p>
            </div>
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
              Consider purchasing more tokens to avoid interruptions.
            </p>
          </div>
        )}

        {tokenBalance >= 10 && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
            <div className="flex items-center space-x-2">
              <FaCoins className="h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                Ready to generate!
              </p>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              You have enough tokens to generate {tokenBalance} apps.
            </p>
          </div>
        )}
      </div>

      {/* Usage Info */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Cost per generation
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            1 token
          </span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-600 dark:text-gray-400">
            Tokens never expire
          </span>
          <span className="font-medium text-green-600 dark:text-green-400">
            ✓
          </span>
        </div>
      </div>
    </motion.div>
  )
}
