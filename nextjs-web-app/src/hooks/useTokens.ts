'use client'

import { useState, useEffect } from 'react'
import { setSentryUser, captureError, ErrorCategory } from '@/lib/sentry'

interface TokenData {
  tokenBalance: number
  email: string
  fullName?: string
}

export function useTokens() {
  const [tokenData, setTokenData] = useState<TokenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTokenBalance()
  }, [])

  const fetchTokenBalance = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tokens/balance')

      if (!response.ok) {
        throw new Error('Failed to fetch token balance')
      }

      const data = await response.json()
      setTokenData(data)
      setError(null)

      // Update Sentry user context with token data
      setSentryUser({
        id: 'current_user', // This will be overridden by actual user data elsewhere
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      captureError(
        err instanceof Error ? err : new Error(errorMessage),
        ErrorCategory.API,
        { action: 'fetch_token_balance' }
      )
    } finally {
      setLoading(false)
    }
  }

  const refreshTokens = () => {
    fetchTokenBalance()
  }

  // Computed values
  const canGenerate = (tokenData?.tokenBalance || 0) > 0
  const tokensRemaining = tokenData?.tokenBalance || 0

  return {
    tokenData,
    loading,
    error,
    refreshTokens,
    // Computed values
    canGenerate,
    tokensRemaining,
  }
}
