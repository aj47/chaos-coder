'use client'

import { useState, useEffect } from 'react'

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

export function useSubscription() {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSubscriptionStatus()
  }, [])

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/stripe/subscription-status')
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription status')
      }
      
      const data = await response.json()
      setSubscriptionData(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const refreshSubscription = () => {
    fetchSubscriptionStatus()
  }

  // Computed values
  const isPro = subscriptionData?.subscription_plan === 'pro' && 
                subscriptionData?.subscription_status === 'active'
  
  const canGenerate = isPro || 
                     (subscriptionData?.daily_generations_used || 0) < 3

  const generationsRemaining = isPro ? -1 : // unlimited
                              Math.max(0, 3 - (subscriptionData?.daily_generations_used || 0))

  const isSubscriptionActive = subscriptionData?.subscription_status === 'active'
  const isSubscriptionPastDue = subscriptionData?.subscription_status === 'past_due'
  const isSubscriptionCanceled = subscriptionData?.subscription_status === 'canceled'

  return {
    subscriptionData,
    loading,
    error,
    refreshSubscription,
    // Computed values
    isPro,
    canGenerate,
    generationsRemaining,
    isSubscriptionActive,
    isSubscriptionPastDue,
    isSubscriptionCanceled,
  }
}
