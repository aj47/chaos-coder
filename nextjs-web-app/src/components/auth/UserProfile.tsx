'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser-client'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useSubscription } from '@/hooks/useSubscription'
import { FaCrown, FaCog } from 'react-icons/fa'

export default function UserProfile() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const { isPro, subscriptionData } = useSubscription()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        if (event === 'SIGNED_OUT') {
          router.push('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth, router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
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
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center space-x-2">
        <a
          href="/login"
          className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Sign In
        </a>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center space-x-3"
    >
      <div className="flex items-center space-x-2">
        {user.user_metadata?.avatar_url && (
          <img
            src={user.user_metadata.avatar_url}
            alt="Profile"
            className="h-8 w-8 rounded-full"
          />
        )}
        <div className="text-sm">
          <div className="flex items-center space-x-1">
            <p className="text-gray-900 dark:text-white font-medium">
              {user.user_metadata?.full_name || user.email}
            </p>
            {isPro && <FaCrown className="h-3 w-3 text-yellow-500" />}
          </div>
          <div className="flex items-center space-x-2">
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              {user.email}
            </p>
            {subscriptionData && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                isPro
                  ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {isPro ? 'Pro' : 'Free'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {subscriptionData?.subscription_status !== 'free' && (
          <button
            onClick={handleManageSubscription}
            className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 px-2 py-1 rounded border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center space-x-1"
          >
            <FaCog className="h-3 w-3" />
            <span>Manage</span>
          </button>
        )}

        <button
          onClick={handleSignOut}
          className="text-sm text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 px-2 py-1 rounded border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </motion.div>
  )
}
