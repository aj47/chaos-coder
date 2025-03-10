import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { PLANS } from '@/lib/stripe';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { AlertModal } from './AlertModal';

interface SubscriptionPlansProps {
  currentPlan: string;
  credits: number | null;
  onSelectPlan: (plan: string) => void;
  isLoading: boolean;
  subscriptionStatus?: string | null;
}

export default function SubscriptionPlans({
  currentPlan,
  // We still need these props for the component signature even if not directly used in this component
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  credits,
  onSelectPlan,
  isLoading,
  subscriptionStatus
}: SubscriptionPlansProps) {
  const { theme } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showDowngradeConfirmation, setShowDowngradeConfirmation] = useState(false);
  const [planToDowngradeTo, setPlanToDowngradeTo] = useState<string | null>(null);
  
  // Check if the user has an active paid subscription
  const hasActiveSubscription = currentPlan !== 'free' && subscriptionStatus === 'active';
  
  const handleSelectPlan = (plan: string) => {
    if (plan === currentPlan.toLowerCase()) {
      return; // Don't allow selecting the current plan
    }
    
    // Check if this is a downgrade
    const isDowngrade = (
      (currentPlan.toLowerCase() === 'ultra' && (plan === 'pro' || plan === 'free')) ||
      (currentPlan.toLowerCase() === 'pro' && plan === 'free')
    );
    
    // Don't allow downgrades without an active subscription
    if (isDowngrade && !hasActiveSubscription) {
      toast.error('You don\'t have an active subscription to downgrade');
      return;
    }
    
    setSelectedPlan(plan);
    
    // If this is a downgrade, show confirmation dialog
    if (isDowngrade) {
      setPlanToDowngradeTo(plan);
      setShowDowngradeConfirmation(true);
    } else {
      // For upgrades, proceed directly
      onSelectPlan(plan);
    }
  };

  const handleConfirmDowngrade = () => {
    if (planToDowngradeTo) {
      // Call onSelectPlan with a flag to indicate this is a downgrade
      onSelectPlan(planToDowngradeTo + ':downgrade');
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold mb-4">Subscription Plans</h2>
      
      {/* Show notice about downgrade requirements if on paid plan without active status */}
      {currentPlan !== 'free' && subscriptionStatus !== 'active' && (
        <div className={`p-4 mb-4 rounded-lg ${
          theme === 'dark' 
            ? 'bg-yellow-800/30 text-yellow-200 border border-yellow-700' 
            : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
        }`}>
          <p className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Your subscription status is <strong className="mx-1">{subscriptionStatus || 'inactive'}</strong>. You need an active subscription to downgrade plans.
          </p>
        </div>
      )}
      
      {/* Downgrade Confirmation Modal */}
      <AlertModal
        isOpen={showDowngradeConfirmation}
        onClose={() => setShowDowngradeConfirmation(false)}
        title="Confirm Plan Downgrade"
        message={`Are you sure you want to downgrade from ${currentPlan.toUpperCase()} to ${planToDowngradeTo?.toUpperCase()}? This will take effect immediately and you'll lose access to your current plan's features.`}
        type="downgrade"
        onConfirm={handleConfirmDowngrade}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Free Plan */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`p-6 rounded-lg border-2 ${
            currentPlan.toLowerCase() === 'free'
              ? theme === 'dark'
                ? 'border-indigo-500 bg-indigo-900/20'
                : 'border-indigo-500 bg-indigo-50'
              : theme === 'dark'
              ? 'border-gray-700 bg-gray-800'
              : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="mb-4">
              <h3 className="text-lg font-bold">{PLANS.FREE.name}</h3>
              <p className="text-2xl font-bold mt-2">Free</p>
              <p className="text-sm opacity-75 mt-1">Forever</p>
            </div>
            
            <div className="mb-6 flex-grow">
              <h4 className="font-medium mb-2">Features:</h4>
              <ul className="space-y-1">
                {PLANS.FREE.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <button
              disabled={currentPlan.toLowerCase() === 'free' || (currentPlan !== 'free' && !hasActiveSubscription)}
              title={currentPlan !== 'free' && !hasActiveSubscription ? 'You need an active subscription to downgrade' : ''}
              className={`mt-auto w-full py-2 rounded-lg font-medium ${
                currentPlan.toLowerCase() === 'free' || (currentPlan !== 'free' && !hasActiveSubscription)
                  ? theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : theme === 'dark'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white'
              }`}
              onClick={() => currentPlan.toLowerCase() !== 'free' && hasActiveSubscription && handleSelectPlan('free')}
            >
              {currentPlan.toLowerCase() === 'free' ? 'Current Plan' : 'Downgrade'}
            </button>
          </div>
        </motion.div>

        {/* Pro Plan */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`p-6 rounded-lg border-2 ${
            currentPlan.toLowerCase() === 'pro'
              ? theme === 'dark'
                ? 'border-indigo-500 bg-indigo-900/20'
                : 'border-indigo-500 bg-indigo-50'
              : theme === 'dark'
              ? 'border-gray-700 bg-gray-800 hover:border-indigo-500'
              : 'border-gray-200 bg-white hover:border-indigo-500'
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="mb-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">{PLANS.PRO.name}</h3>
                <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800 font-medium">Popular</span>
              </div>
              <p className="text-2xl font-bold mt-2">${PLANS.PRO.price}/mo</p>
              <p className="text-sm opacity-75 mt-1">{PLANS.PRO.credits} credits/day</p>
            </div>
            
            <div className="mb-6 flex-grow">
              <h4 className="font-medium mb-2">Features:</h4>
              <ul className="space-y-1">
                {PLANS.PRO.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleSelectPlan('pro')}
              disabled={currentPlan.toLowerCase() === 'pro' || isLoading || (currentPlan.toLowerCase() === 'ultra' && !hasActiveSubscription)}
              title={currentPlan.toLowerCase() === 'ultra' && !hasActiveSubscription ? 'You need an active subscription to downgrade' : ''}
              className={`mt-auto w-full py-2 rounded-lg font-medium ${
                currentPlan.toLowerCase() === 'pro' || (currentPlan.toLowerCase() === 'ultra' && !hasActiveSubscription)
                  ? theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : theme === 'dark'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white'
              }`}
            >
              {isLoading && selectedPlan === 'pro' ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : currentPlan.toLowerCase() === 'pro' ? (
                'Current Plan'
              ) : currentPlan.toLowerCase() === 'ultra' ? (
                'Downgrade'
              ) : (
                'Upgrade'
              )}
            </button>
          </div>
        </motion.div>

        {/* Ultra Plan */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`p-6 rounded-lg border-2 ${
            currentPlan.toLowerCase() === 'ultra'
              ? theme === 'dark'
                ? 'border-indigo-500 bg-indigo-900/20'
                : 'border-indigo-500 bg-indigo-50'
              : theme === 'dark'
              ? 'border-gray-700 bg-gray-800 hover:border-indigo-500'
              : 'border-gray-200 bg-white hover:border-indigo-500'
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="mb-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">{PLANS.ULTRA.name}</h3>
                <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 font-medium">Best Value</span>
              </div>
              <p className="text-2xl font-bold mt-2">${PLANS.ULTRA.price}/mo</p>
              <p className="text-sm opacity-75 mt-1">{PLANS.ULTRA.credits} credits/day</p>
            </div>
            
            <div className="mb-6 flex-grow">
              <h4 className="font-medium mb-2">Features:</h4>
              <ul className="space-y-1">
                {PLANS.ULTRA.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleSelectPlan('ultra')}
              disabled={currentPlan.toLowerCase() === 'ultra' || isLoading}
              className={`mt-auto w-full py-2 rounded-lg font-medium ${
                currentPlan.toLowerCase() === 'ultra'
                  ? theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : theme === 'dark'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white'
              }`}
            >
              {isLoading && selectedPlan === 'ultra' ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : currentPlan.toLowerCase() === 'ultra' ? (
                'Current Plan'
              ) : (
                'Upgrade'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 