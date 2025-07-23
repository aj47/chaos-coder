'use client'

import { ReactNode, useState } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import UpgradePrompt from './UpgradePrompt'

interface FeatureGateProps {
  feature: 'generation' | 'export' | 'deploy' | 'premium_templates'
  children: ReactNode
  fallback?: ReactNode
  showUpgradePrompt?: boolean
}

export default function FeatureGate({ 
  feature, 
  children, 
  fallback, 
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const { isPro, canGenerate, generationsRemaining, loading } = useSubscription()
  const [showUpgrade, setShowUpgrade] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  const checkFeatureAccess = () => {
    switch (feature) {
      case 'generation':
        return canGenerate
      case 'export':
      case 'deploy':
      case 'premium_templates':
        return isPro
      default:
        return false
    }
  }

  const getUpgradeReason = () => {
    switch (feature) {
      case 'generation':
        return generationsRemaining === 0 
          ? 'You\'ve reached your daily limit of 3 generations. Upgrade to Pro for unlimited generations.'
          : 'Upgrade to Pro for unlimited generations and premium features.'
      case 'export':
        return 'Export functionality is available for Pro subscribers only.'
      case 'deploy':
        return 'Deployment features are available for Pro subscribers only.'
      case 'premium_templates':
        return 'Premium templates are available for Pro subscribers only.'
      default:
        return 'This feature requires a Pro subscription.'
    }
  }

  const hasAccess = checkFeatureAccess()

  if (hasAccess) {
    return <>{children}</>
  }

  const handleUpgradeClick = () => {
    if (showUpgradePrompt) {
      setShowUpgrade(true)
    }
  }

  if (fallback) {
    return (
      <>
        {fallback}
        {showUpgradePrompt && (
          <UpgradePrompt
            isOpen={showUpgrade}
            onClose={() => setShowUpgrade(false)}
            reason={getUpgradeReason()}
          />
        )}
      </>
    )
  }

  // Default fallback UI
  return (
    <>
      <div className="relative">
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 rounded-lg">
          <div className="text-center p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {getUpgradeReason()}
            </div>
            {showUpgradePrompt && (
              <button
                onClick={handleUpgradeClick}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>
      </div>
      
      {showUpgradePrompt && (
        <UpgradePrompt
          isOpen={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          reason={getUpgradeReason()}
        />
      )}
    </>
  )
}
