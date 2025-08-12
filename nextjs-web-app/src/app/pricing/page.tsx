'use client'

import { motion } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import { useSubscription } from '@/hooks/useSubscription'
import UserProfile from '@/components/auth/UserProfile'
import TokenPackageCard from '@/components/tokens/TokenPackageCard'
import { FaArrowLeft } from 'react-icons/fa'
import { useRouter } from 'next/navigation'

// Define token packages locally to avoid server-side imports
const TOKEN_PACKAGES = {
  STARTER: {
    name: 'Starter Pack',
    tokens: 100,
    price: 10,
    description: 'Perfect for trying out the platform',
    features: [
      '100 app generations',
      'All templates included',
      'Community support'
    ],
    popular: false
  },
  POPULAR: {
    name: 'Popular Pack',
    tokens: 300,
    price: 20,
    description: 'Best value for regular users',
    features: [
      '300 app generations',
      'All templates included',
      'Priority support',
      'Advanced customization'
    ],
    popular: true
  },
  PREMIUM: {
    name: 'Premium Pack',
    tokens: 1000,
    price: 50,
    description: 'For power users and teams',
    features: [
      '1000 app generations',
      'All templates included',
      'Priority support',
      'Advanced customization',
      'Export to GitHub',
      'Custom domains'
    ],
    popular: false
  }
}

export default function PricingPage() {
  const { theme } = useTheme()
  const router = useRouter()
  const { subscriptionData } = useSubscription()

  const currentPlan = subscriptionData?.subscription_plan || 'free'

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
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <FaArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Pricing Plans
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose the plan that&apos;s right for you
                </p>
              </div>
            </div>
            <UserProfile />
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Pay-Per-Use Token Packages
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Buy tokens and use them whenever you need. Each app generation costs 1 token.
          </p>
        </motion.div>

        {/* Token Package Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <TokenPackageCard
              package={TOKEN_PACKAGES.STARTER}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <TokenPackageCard
              package={TOKEN_PACKAGES.POPULAR}
              isPopular={true}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <TokenPackageCard
              package={TOKEN_PACKAGES.PREMIUM}
            />
          </motion.div>
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16"
        >
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Frequently Asked Questions
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Can I cancel anytime?
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Yes, you can cancel your subscription at any time. You&apos;ll continue to have access to Pro features until the end of your billing period.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  What happens to my apps if I downgrade?
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Your existing apps will remain accessible, but you&apos;ll be limited to the free plan&apos;s daily generation limits for new apps.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Do you offer refunds?
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  We offer a 30-day money-back guarantee for new subscribers. Contact support if you&apos;re not satisfied.
                </p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Is my payment information secure?
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Yes, all payments are processed securely through Stripe. We never store your payment information on our servers.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Can I upgrade or downgrade my plan?
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Yes, you can change your plan at any time. Changes will be prorated and reflected in your next billing cycle.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Do you offer team or enterprise plans?
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  We&apos;re working on team plans! Contact us if you&apos;re interested in enterprise features or volume discounts.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to get started?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Join thousands of developers who are already building amazing web applications with 4x-dev.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Try Free Now
              </button>
              <button
                onClick={() => {
                  const proCard = document.querySelector('[data-plan="pro"]')
                  proCard?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
