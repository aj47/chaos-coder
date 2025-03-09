"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { createClient } from "@/lib/supabase/client";
import { useTokenStore } from "@/store/useTokenStore";
import { checkAndRefreshCredits } from "@/lib/credits";
import SubscriptionPlans from "@/components/SubscriptionPlans";
import CreditPurchase from "@/components/CreditPurchase";

export default function DashboardPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [maxCredits, setMaxCredits] = useState(5); // Default to 5 daily credits for free plan
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isPurchasingCredits, setIsPurchasingCredits] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const setTokens = useTokenStore((state) => state.setTokens);
  const [creditsRefreshed, setCreditsRefreshed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          throw new Error(userError.message);
        }
        
        if (!userData?.user) {
          router.push("/");
          return;
        }
        
        // Set user email
        setUserEmail(userData.user.email || null);
        
        // Check if credits need to be refreshed for the day
        const { credits: refreshedCredits, refreshed } = await checkAndRefreshCredits(
          supabase,
          userData.user.id
        );
        
        if (refreshed) {
          setCredits(refreshedCredits);
          setTokens(refreshedCredits);
          setCreditsRefreshed(true);
          
          // Hide the refreshed message after 5 seconds
          setTimeout(() => {
            setCreditsRefreshed(false);
          }, 5000);
        }
        
        // Fetch user profile to get subscription info - adding logging
        console.log('Fetching user profile for:', userData.user.id);
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*') // Get all columns for debugging
          .eq('id', userData.user.id)
          .single();
        
        if (profileError) {
          console.error("Error fetching profile:", profileError);
        } else if (data) {
          // First cast to unknown then to the expected type
          const profile = data as unknown as {
            credits: number;
            subscription_tier?: string;
            subscription_status?: string;
            max_daily_credits?: number;
            stripe_subscription_id?: string;
            stripe_customer_id?: string;
          };
          
          // Only update credits if they weren't just refreshed
          if (!refreshed) {
            setCredits(profile.credits);
            setTokens(profile.credits); // Update token store with credits from profile
          }
          
          setSubscriptionTier(profile.subscription_tier || "free");
          setSubscriptionStatus(profile.subscription_status || null);
          setMaxCredits(profile.max_daily_credits || 5); // Default to 5 daily credits for free plan
        }
      } catch (err) {
        console.error("Error checking user:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();
  }, [router, setTokens]);

  // Check for successful Stripe session
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const creditsPurchased = searchParams.get('credits_purchased');
    const purchasedAmount = searchParams.get('amount');

    if (sessionId && creditsPurchased === 'true' && purchasedAmount) {
      setSuccessMessage(`Payment successful! ${purchasedAmount} credits have been added to your account.`);
      
      // Remove the parameters from the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Refresh profile data after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else if (sessionId) {
      setSuccessMessage("Payment successful! Your subscription has been updated.");
      
      // Remove the session_id from the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Refresh profile data after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [searchParams]);

  const handleSelectPlan = async (plan: string) => {
    try {
      setIsUpgrading(true);
      
      // Check if this is a downgrade request
      const [planType, action] = plan.split(':');
      const isDowngrade = action === 'downgrade';
      
      console.log('Plan selection:', { 
        planType, 
        isDowngrade, 
        subscriptionStatus, 
        subscriptionTier,
        currentState: {
          creditsAvailable: credits,
          maxCreditsAllowed: maxCredits
        }
      });
      
      // First check if the user can make this change
      if (isDowngrade && subscriptionStatus !== 'active') {
        console.log('Preventing downgrade - subscription not active:', subscriptionStatus);
        setError(`You need an active subscription to downgrade. Your current subscription status is "${subscriptionStatus || 'none'}".`);
        return;
      }
      
      if (isDowngrade) {
        console.log('Calling downgrade API with plan:', planType.toUpperCase());
        
        try {
          // Call the downgrade API
          const response = await fetch('/api/stripe/downgrade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: planType.toUpperCase() }),
          });
          
          // Log the raw response for debugging
          console.log('Downgrade API response status:', response.status);
          const responseText = await response.text();
          console.log('Downgrade API response text:', responseText);
          
          // Parse the JSON response, if it's valid JSON
          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch (e) {
            console.error('Error parsing API response as JSON:', e);
            throw new Error('Received invalid response from server');
          }
          
          if (!response.ok) {
            // Special handling for server errors that might be recoverable
            if (response.status === 500) {
              console.log('Server error, but may still have worked. Attempting to refresh...');
              // Set success message optimistically
              setSuccessMessage('Plan update initiated. Refreshing to check status...');
              
              // Refresh the page after a delay
              setTimeout(() => {
                window.location.reload();
              }, 2000);
              return;
            }
            
            // Provide a more helpful message for the common error case
            if (responseData.error === 'No active subscription found') {
              throw new Error('You need an active paid subscription to downgrade. Please subscribe to a paid plan first.');
            }
            throw new Error(responseData.error || 'Failed to downgrade plan');
          }
          
          // Handle success - either redirect or display success message
          setSuccessMessage(responseData.message || 'Plan downgraded successfully.');
          
          // Refresh the page after a delay to show updated status
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } catch (apiError) {
          console.error('API error:', apiError);
          throw apiError;
        }
      } else {
        // For upgrades, continue with existing checkout flow
        // Call the checkout API
        const response = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planType.toUpperCase() }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create checkout session');
        }
        
        const { url } = await response.json();
        
        // Redirect to Stripe Checkout
        window.location.href = url;
      }
    } catch (err) {
      console.error("Error updating plan:", err);
      setError(err instanceof Error ? err.message : "An error occurred while updating your plan");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handlePurchaseCredits = async (amount: number) => {
    try {
      setIsPurchasingCredits(true);
      
      // Call the credits purchase API
      const response = await fetch('/api/stripe/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }
      
      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err) {
      console.error("Error purchasing credits:", err);
      setError(err instanceof Error ? err.message : "An error occurred during checkout");
    } finally {
      setIsPurchasingCredits(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
          <p className="mt-3">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          {/* Profile Section */}
          {userEmail && (
            <div className={`p-3 rounded-lg flex items-center gap-3 ${theme === "dark" ? "bg-gray-800" : "bg-white shadow-sm"}`}>
              <div className="flex flex-col">
                <span className="text-sm opacity-75">Signed in as:</span>
                <span className="font-medium">{userEmail}</span>
              </div>
              <button
                onClick={handleLogout}
                className={`py-2 px-4 rounded-lg text-sm font-medium ${
                  theme === "dark"
                    ? "bg-red-800 hover:bg-red-700 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
                }`}
              >
                Log Out
              </button>
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {successMessage && (
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800'}`}>
              {successMessage}
            </div>
          )}
          
          {creditsRefreshed && (
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-blue-900 text-blue-100' : 'bg-blue-100 text-blue-800'}`}>
              Your daily credits have been refreshed!
            </div>
          )}
          
          {error && (
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-800'}`}>
              {error}
            </div>
          )}

          {/* Billing & Credits */}
          <div className={`p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow-md"}`}>
            <h2 className="text-xl font-bold mb-4">Billing & Credits</h2>
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Current Plan</h3>
              <div className={`p-4 rounded-lg border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold capitalize">{subscriptionTier} Plan</p>
                    <p className="text-sm opacity-75">
                      {subscriptionTier === 'free' 
                        ? '30 credits per day' 
                        : subscriptionTier === 'pro' 
                          ? '100 credits per day' 
                          : '1000 credits per day'}
                    </p>
                    {subscriptionStatus && subscriptionTier !== 'free' && (
                      <p className="text-sm mt-1 capitalize">
                        Status: <span className={`font-medium ${
                          subscriptionStatus === 'active' 
                            ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                            : theme === 'dark' ? 'text-red-400' : 'text-red-600'
                        }`}>{subscriptionStatus}</span>
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xl font-bold">{credits} / {maxCredits}</p>
                    <p className="text-sm opacity-75">Credits Available</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Credit Purchase for Pro and Ultra subscribers */}
            {subscriptionTier && subscriptionTier !== 'free' && (
              <CreditPurchase 
                subscriptionTier={subscriptionTier}
                isLoading={isPurchasingCredits}
                onPurchase={handlePurchaseCredits}
              />
            )}
          </div>
          
          {/* Subscription Plans */}
          <SubscriptionPlans 
            currentPlan={subscriptionTier}
            credits={credits}
            maxCredits={maxCredits}
            onSelectPlan={handleSelectPlan}
            isLoading={isUpgrading}
            subscriptionStatus={subscriptionStatus}
          />
        </motion.div>
      </div>
    </div>
  );
}