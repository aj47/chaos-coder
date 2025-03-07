"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { createClient } from "@/lib/supabase/client";
import { SUBSCRIPTION_PLANS, initiateSubscription, cancelSubscription, getUserCreditsInfo } from "@/services/stripe-client";
import { loadStripe } from "@stripe/stripe-js";
import { SubscriptionTier } from "@/types/supabase";
import { User } from "@supabase/supabase-js";

// Initialize Stripe (we need this for the Stripe checkout to work)
loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface UserSubscription {
  tier: SubscriptionTier;
  name: string;
  description: string;
  price: number;
  creditsPerMonth: number;
}

export default function DashboardPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [subscription, setSubscription] = useState<UserSubscription>({
    tier: 'free',
    name: 'Free',
    description: 'Basic access with limited features',
    price: 0,
    creditsPerMonth: 10,
  });
  
  // These state variables are used in the full component that's not shown here
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [user, setUser] = useState<User | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [name, setName] = useState<string>('User');
  
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log("[DEBUG] Dashboard - Session check:", session ? `User: ${session.user.id}` : "No session");
        
        if (!session) {
          // If no session, redirect to home page
          console.log("[DEBUG] Dashboard - No session, redirecting to home");
          router.push('/');
          return;
        }
        
        // User is authenticated, get user data
        setUser(session.user);
        
        // Get user's first name from metadata
        if (session.user.user_metadata?.first_name) {
          setName(session.user.user_metadata.first_name);
        }
        
        // Get user's credits and subscription info using the client-side function
        // This function will ensure the profile exists
        try {
          const creditsInfo = await getUserCreditsInfo();
          setCredits(creditsInfo.credits);
          setSubscription(creditsInfo.subscription);
        } catch (creditsError) {
          console.error("[DEBUG] Dashboard - Error fetching credits info:", creditsError);
          setError("Failed to load your credits information. Please try again later.");
        }
      } catch (err) {
        console.error("[DEBUG] Dashboard - Error in checkUser:", err);
        setError("An unexpected error occurred. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();
    
    // Check for successful Stripe checkout
    const query = new URLSearchParams(window.location.search);
    if (query.get('session_id')) {
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refresh user data to get updated subscription
      checkUser();
    }
  }, [router]);

  const handleSubscribe = async (planType: string) => {
    try {
      setLoadingCheckout(true);
      setError(null);
      
      // Use the client-side function to initiate subscription
      const { url } = await initiateSubscription(planType as SubscriptionTier);
      
      // Redirect to Stripe checkout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error("[DEBUG] Dashboard - Error subscribing:", err);
      setError("Failed to initiate subscription. Please try again later.");
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCancelingSubscription(true);
      setError(null);
      
      // Use the client-side function to cancel subscription
      await cancelSubscription();
      
      // Update subscription to free tier
      setSubscription({
        tier: 'free',
        name: 'Free',
        description: 'Basic access with limited features',
        price: 0,
        creditsPerMonth: SUBSCRIPTION_PLANS.free.credits_per_month,
      });
      
      // Show success message
      alert('Your subscription has been canceled successfully.');
    } catch (err) {
      console.error("[DEBUG] Dashboard - Error canceling subscription:", err);
      setError("Failed to cancel subscription. Please try again later.");
    } finally {
      setCancelingSubscription(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-indigo-500 border-indigo-200 rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
        <div className={`w-full max-w-md p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow-md"}`}>
          <h2 className="text-xl font-bold mb-4">Error</h2>
          <p className="mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className={`w-full py-2 px-4 rounded-lg font-medium ${
              theme === "dark"
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-indigo-500 hover:bg-indigo-600 text-white"
            }`}
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <button
            onClick={() => router.push("/")}
            className={`px-4 py-2 rounded-lg font-medium ${
              theme === "dark"
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-indigo-500 hover:bg-indigo-600 text-white"
            }`}
          >
            Return to App
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Billing & Credits */}
          <div className={`p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow-md"}`}>
            <h2 className="text-xl font-bold mb-4">Billing & Credits</h2>
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Current Plan</h3>
              <div className={`p-4 rounded-lg border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">{subscription.name}</p>
                    <p className="text-sm opacity-75">{subscription.creditsPerMonth} credits per month</p>
                    {subscription.price > 0 && (
                      <p className="text-sm opacity-75">${subscription.price.toFixed(2)}/month</p>
                    )}
                  </div>
                  {subscription.tier === 'free' && (
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleSubscribe('pro')}
                        disabled={loadingCheckout}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          theme === "dark"
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                            : "bg-indigo-500 hover:bg-indigo-600 text-white"
                        } ${loadingCheckout ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {loadingCheckout ? 'Loading...' : 'Upgrade to Pro ($10/mo)'}
                      </button>
                      <button 
                        onClick={() => handleSubscribe('ultra')}
                        disabled={loadingCheckout}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          theme === "dark"
                            ? "bg-purple-600 hover:bg-purple-700 text-white"
                            : "bg-purple-500 hover:bg-purple-600 text-white"
                        } ${loadingCheckout ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {loadingCheckout ? 'Loading...' : 'Upgrade to Ultra ($50/mo)'}
                      </button>
                    </div>
                  )}
                  {subscription.tier === 'pro' && (
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleSubscribe('ultra')}
                        disabled={loadingCheckout}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          theme === "dark"
                            ? "bg-purple-600 hover:bg-purple-700 text-white"
                            : "bg-purple-500 hover:bg-purple-600 text-white"
                        } ${loadingCheckout ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {loadingCheckout ? 'Loading...' : 'Upgrade to Ultra ($50/mo)'}
                      </button>
                      <button 
                        onClick={handleCancelSubscription}
                        disabled={cancelingSubscription}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          theme === "dark"
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-red-500 hover:bg-red-600 text-white"
                        } ${cancelingSubscription ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {cancelingSubscription ? 'Canceling...' : 'Cancel Subscription'}
                      </button>
                    </div>
                  )}
                  {subscription.tier === 'ultra' && (
                    <div className="flex space-x-2">
                      <button 
                        onClick={handleCancelSubscription}
                        disabled={cancelingSubscription}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          theme === "dark"
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-red-500 hover:bg-red-600 text-white"
                        } ${cancelingSubscription ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {cancelingSubscription ? 'Canceling...' : 'Cancel Subscription'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Available Credits</h3>
              <div className={`p-4 rounded-lg border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">{credits} / {subscription.creditsPerMonth}</p>
                    <p className="text-sm opacity-75">Credits remaining this month</p>
                  </div>
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full" 
                      style={{ width: `${Math.min(100, (credits / subscription.creditsPerMonth) * 100)}%` }}
                      role="progressbar"
                      aria-valuenow={Math.min(100, (credits / subscription.creditsPerMonth) * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Subscription Plans */}
          <div className={`p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow-md"}`}>
            <h2 className="text-xl font-bold mb-4">Subscription Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Free Plan */}
              <div className={`p-4 rounded-lg border ${theme === "dark" ? "border-gray-700" : "border-gray-200"} ${subscription.tier === 'free' ? 'ring-2 ring-indigo-500' : ''}`}>
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold">{SUBSCRIPTION_PLANS.free.name}</h3>
                  <p className="text-2xl font-bold mt-2">Free</p>
                  <p className="text-sm opacity-75 mt-1">{SUBSCRIPTION_PLANS.free.credits_per_month} credits/month</p>
                </div>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Basic access
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Limited generations
                  </li>
                </ul>
                <button 
                  className={`w-full py-2 px-4 rounded-lg font-medium ${
                    subscription.tier === 'free'
                      ? 'bg-gray-400 cursor-not-allowed'
                      : theme === "dark"
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                        : "bg-indigo-500 hover:bg-indigo-600 text-white"
                  }`}
                  disabled={subscription.tier === 'free'}
                >
                  {subscription.tier === 'free' ? 'Current Plan' : 'Downgrade'}
                </button>
              </div>
              
              {/* Pro Plan */}
              <div className={`p-4 rounded-lg border ${theme === "dark" ? "border-gray-700" : "border-gray-200"} ${subscription.tier === 'pro' ? 'ring-2 ring-indigo-500' : ''}`}>
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold">{SUBSCRIPTION_PLANS.pro.name}</h3>
                  <p className="text-2xl font-bold mt-2">${SUBSCRIPTION_PLANS.pro.price.toFixed(2)}<span className="text-sm font-normal">/month</span></p>
                  <p className="text-sm opacity-75 mt-1">{SUBSCRIPTION_PLANS.pro.credits_per_month} credits/month</p>
                </div>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    All free features
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    100 monthly credits
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Advanced features
                  </li>
                </ul>
                <button 
                  onClick={() => subscription.tier !== 'pro' && handleSubscribe('pro')}
                  disabled={subscription.tier === 'pro' || loadingCheckout}
                  className={`w-full py-2 px-4 rounded-lg font-medium ${
                    subscription.tier === 'pro' || loadingCheckout
                      ? 'bg-gray-400 cursor-not-allowed'
                      : theme === "dark"
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                        : "bg-indigo-500 hover:bg-indigo-600 text-white"
                  }`}
                >
                  {subscription.tier === 'pro' 
                    ? 'Current Plan' 
                    : loadingCheckout 
                      ? 'Loading...' 
                      : 'Subscribe - $10/month'}
                </button>
              </div>
              
              {/* Ultra Plan */}
              <div className={`p-4 rounded-lg border ${theme === "dark" ? "border-gray-700" : "border-gray-200"} ${subscription.tier === 'ultra' ? 'ring-2 ring-indigo-500' : ''}`}>
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold">{SUBSCRIPTION_PLANS.ultra.name}</h3>
                  <p className="text-2xl font-bold mt-2">${SUBSCRIPTION_PLANS.ultra.price.toFixed(2)}<span className="text-sm font-normal">/month</span></p>
                  <p className="text-sm opacity-75 mt-1">{SUBSCRIPTION_PLANS.ultra.credits_per_month} credits/month</p>
                </div>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    All pro features
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    500 monthly credits
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Premium support
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Exclusive features
                  </li>
                </ul>
                <button 
                  onClick={() => subscription.tier !== 'ultra' && handleSubscribe('ultra')}
                  disabled={subscription.tier === 'ultra' || loadingCheckout}
                  className={`w-full py-2 px-4 rounded-lg font-medium ${
                    subscription.tier === 'ultra' || loadingCheckout
                      ? 'bg-gray-400 cursor-not-allowed'
                      : theme === "dark"
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "bg-purple-500 hover:bg-purple-600 text-white"
                  }`}
                >
                  {subscription.tier === 'ultra' 
                    ? 'Current Plan' 
                    : loadingCheckout 
                      ? 'Loading...' 
                      : 'Subscribe - $50/month'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 