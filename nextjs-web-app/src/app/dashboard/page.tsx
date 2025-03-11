"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { AuthService } from "@/lib/auth";
import { checkAndRefreshCredits } from "@/lib/credits";
import SubscriptionPlans from "@/components/SubscriptionPlans";
import CreditPurchase from "@/components/CreditPurchase";

export default function DashboardPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Use our new auth context instead of zustand store
  const { user, tokens, setTokens, syncTokensWithDB, isLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isProcessingCredits, setIsProcessingCredits] = useState(false);
  const [creditsRefreshed, setCreditsRefreshed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = AuthService.createClient();
    
    // Load tokens from localStorage on initialization
    const storedTokens = localStorage.getItem('user-tokens');
    if (storedTokens) {
      setTokens(parseInt(storedTokens, 10) || 0);
    }

    // Check current session
    const checkUser = async () => {
      try {
        // Only redirect if we're sure the user isn't logged in (not during loading)
        if (!isLoading && !user) {
          router.push("/");
          return;
        }
        
        // If still loading, wait for it to complete
        if (isLoading) {
          return;
        }
        
        // Set user email
        setUserEmail(user?.email || null);
        
        // Check if this is a new login (using sessionStorage to track login state)
        const isNewLogin = !sessionStorage.getItem('dashboard_visited');
        if (isNewLogin && user) {
          // Set a welcome message for new logins
          setSuccessMessage(`Welcome back, ${user.email}!`);
          
          // Mark as visited
          sessionStorage.setItem('dashboard_visited', 'true');
          
          // Hide the welcome message after 5 seconds
          setTimeout(() => {
            setSuccessMessage(null);
          }, 5000);
        }
        
        // Check if credits need to be refreshed for the day
        if (user) {
          const { credits: refreshedCredits, refreshed } = await checkAndRefreshCredits(
            supabase,
            user.id
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
          
          // Fetch user profile to get subscription info
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (profileError) {
            console.error("Error fetching profile:", profileError);
          } else if (profileData) {
            // First cast to unknown then to the expected type
            const profile = profileData as unknown as {
              credits: number;
              subscription_tier?: string;
              subscription_status?: string;
              max_daily_credits?: number;
              stripe_subscription_id?: string;
              stripe_customer_id?: string;
            };
            
            // Only update if values are different to prevent loops
            if (!refreshed && profile.credits !== credits) {
              setCredits(profile.credits);
              // Only update tokens if they're different
              if (tokens !== profile.credits) {
                setTokens(profile.credits);
              }
            }
            
            if (profile.subscription_tier !== subscriptionTier) {
              setSubscriptionTier(profile.subscription_tier || "free");
            }
            if (profile.subscription_status !== subscriptionStatus) {
              setSubscriptionStatus(profile.subscription_status || null);
            }
          }
        }
      } catch (err) {
        console.error("Error checking user:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();
    
    // Clear the dashboard_visited flag when the component is unmounted
    return () => {
      // Only clear if the user is navigating away from the dashboard
      if (window.location.pathname !== '/dashboard') {
        sessionStorage.removeItem('dashboard_visited');
      }
    };
  }, [router, user, isLoading]); // Remove tokens and other dependencies that cause loops

  // Modify the force refresh tokens effect to only run on mount
  useEffect(() => {
    let mounted = true;
    
    const initialSync = async () => {
      // If we have a user but credits/tokens aren't loaded, try to sync
      if (user && tokens === 0 && !loading && mounted) {
        await syncTokensWithDB();
      }
    };
    
    initialSync();
    
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - only run on mount

  // Helper function to update state from profile - modify to prevent loops
  const updateStateFromProfile = (profile: {
    credits?: number;
    subscription_tier?: string;
    subscription_status?: string;
    email?: string;
  }) => {
    if (profile) {
      // Only update if the values are different
      const creditValue = profile.credits !== undefined ? profile.credits : 0;
      if (credits !== creditValue) {
        setCredits(creditValue);
        setTokens(creditValue);
      }
      
      if (subscriptionTier !== (profile.subscription_tier || 'free')) {
        setSubscriptionTier(profile.subscription_tier || 'free');
      }
      
      if (subscriptionStatus !== profile.subscription_status) {
        setSubscriptionStatus(profile.subscription_status || null);
      }
      
      if (userEmail !== profile.email) {
        setUserEmail(profile.email || null);
      }
    }
  };

  // Check for successful Stripe session
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const creditsPurchased = searchParams.get('credits_purchased');
    const purchasedAmount = searchParams.get('amount');
    const planType = searchParams.get('plan');

    if (sessionId && creditsPurchased === 'true' && purchasedAmount) {
      setSuccessMessage(`Payment successful! ${purchasedAmount} credits have been added to your account.`);
      
      // Remove the parameters from the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Refresh profile data immediately instead of reloading the page
      refreshUserProfile().then(() => {
        // Hide success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      });
    } else if (sessionId && planType) {
      // Handle plan upgrade success
      const planName = planType.toLowerCase();
      setSuccessMessage(`Payment successful! Your subscription has been upgraded to ${planName.toUpperCase()}.`);
      
      // Update the UI immediately to reflect the upgrade
      setSubscriptionTier(planName);
      setSubscriptionStatus('active');
      
      // Remove the session_id from the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Refresh profile data immediately instead of reloading the page
      refreshUserProfile().then(() => {
        // Hide success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      });
    } else if (sessionId) {
      setSuccessMessage("Payment successful! Your subscription has been updated.");
      
      // Remove the session_id from the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Refresh profile data immediately instead of reloading the page
      refreshUserProfile().then(() => {
        // Hide success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      });
    }
  }, [searchParams]);

  const handleSelectPlan = async (plan: string) => {
    try {
      setIsUpgrading(true);
      
      // Check if this is a downgrade request
      const [planType, action] = plan.split(':');
      const isDowngrade = action === 'downgrade';
      
      // First check if the user can make this change
      if (isDowngrade && subscriptionStatus !== 'active') {
        setError(`You need an active subscription to downgrade. Your current subscription status is "${subscriptionStatus || 'none'}".`);
        return;
      }
      
      if (isDowngrade) {
        try {
          // Call the downgrade API
          const response = await fetch('/api/stripe/downgrade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          
          const responseText = await response.text();
          
          // Parse the JSON response, if it's valid JSON
          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch {
            throw new Error('Received invalid response from server');
          }
          
          if (!response.ok) {
            // Special handling for server errors that might be recoverable
            if (response.status === 500) {
              setSuccessMessage('Plan update initiated. Refreshing to check status...');
              
              // Refresh the page after a delay
              setTimeout(() => {
                window.location.reload();
              }, 2000);
              return;
            }
            
            throw new Error(responseData?.error || 'Unknown error occurred');
          }
          
          // Success path
          setSuccessMessage(responseData?.message || 'Subscription downgraded successfully');
          
          // Update the UI immediately to reflect the downgrade
          setSubscriptionTier(planType.toLowerCase());
          
          // Reset state
          setIsUpgrading(false);
          setError(null);
          
          // Refresh the profile data
          await refreshUserProfile();
        } catch (error) {
          setError('Failed to update subscription. Please try again later.');
          console.error('Downgrade error:', error);
        }
      } else {
        // Regular upgrade flow - redirect to Stripe Checkout
        try {
          // Create Stripe checkout session
          const response = await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tier: planType.toLowerCase() }),
          });
          
          if (!response.ok) {
            const { error } = await response.json();
            throw new Error(error || 'Failed to create checkout session');
          }
          
          const { url } = await response.json();
          
          // Redirect to checkout
          if (url) {
            window.location.href = url;
          }
        } catch (error) {
          setError('Failed to start checkout process. Please try again later.');
          console.error('Upgrade error:', error);
        }
      }
    } finally {
      setIsUpgrading(false);
    }
  };

  const handlePurchaseCredits = async (amount: number) => {
    try {
      setIsProcessingCredits(true);
      
      // Create Stripe checkout session for credit purchase
      const response = await fetch('/api/stripe/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      
      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to create checkout session');
      }
      
      const { url } = await response.json();
      
      // Redirect to checkout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch {
      setError('Failed to start checkout process. Please try again later.');
    } finally {
      setIsProcessingCredits(false);
    }
  };

  const handleLogout = async () => {
    // Clear the dashboard_visited flag
    sessionStorage.removeItem('dashboard_visited');
    
    // Use the new AuthService for logout
    await AuthService.signOut();
    router.push('/');
  };

  // Helper function to get user data
  const getUserData = async () => {
    try {
      console.log("Getting user data");
      const supabase = AuthService.createClient();
      const { user, error } = await AuthService.getCurrentUser(supabase);
      
      if (error) {
        console.error("User error:", error);
        setError(error.message);
        setLoading(false);
        return null;
      }
      
      if (!user) {
        console.log("No user found, redirecting to home");
        setLoading(false);
        router.push("/");
        return null;
      }
      
      console.log("User found:", user.id);
      return user;
    } catch (err) {
      console.error("Error in getUserData:", err);
      setError("Failed to get user information");
      setLoading(false);
      return null;
    }
  };
  
  // Fix the getUserProfile reference by creating a new local function
  const refreshUserProfile = async () => {
    try {
      console.log("Refreshing user profile");
      // Set loading true only if it's a manual refresh (not initial load)
      setLoading(true);
      
      const userData = await getUserData();
      if (!userData) {
        console.log("No user data found during refresh");
        setLoading(false);
        return null;
      }
      
      console.log("User data found, fetching profile for:", userData.id);
      const supabase = AuthService.createClient();
      // Fetch latest user profile from database
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);
        setError("Unable to load profile data");
        setLoading(false);
        return null;
      }
      
      console.log("Profile data retrieved:", profileData);
      if (profileData) {
        // Update all state using the helper function
        updateStateFromProfile(profileData);
        
        // Log what's happening with credits
        if (profileData.credits !== undefined) {
          console.log(`Updated credits to ${profileData.credits} and token store updated`);
        } else {
          console.warn("Profile didn't contain credits data");
        }
      } else {
        console.warn("No profile data returned from database");
      }
      
      // Always ensure loading is set to false
      setLoading(false);
      return profileData;
    } catch (err) {
      console.error("Error in refreshUserProfile:", err);
      setError("Unable to check user account");
      // Always ensure loading is set to false, even on error
      setLoading(false);
      return null;
    }
  };

  // Add a safety mechanism to prevent infinite loading
  useEffect(() => {
    // If loading is true for more than 10 seconds, force it to false
    if (loading) {
      const timeout = setTimeout(() => {
        console.log("Safety timeout triggered - forcing loading to false");
        setLoading(false);
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  // Add a cleanup effect for when the component unmounts
  useEffect(() => {
    return () => {
      // Clear any potential loading state when component unmounts
      setLoading(false);
    };
  }, []);

  // Remove excessive logging in production
  // console.log("Dashboard render - tokens:", tokens, "credits:", credits, "loading:", loading, "tokenLoading:", tokenLoading);

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
                    <p className="text-xl font-bold">
                      {/* Force display tokens regardless of loading state */}
                      {tokens !== null && tokens !== undefined 
                        ? tokens 
                        : credits !== null 
                          ? credits 
                          : '0'}
                    </p>
                    <p className="text-sm opacity-75">Credits Available</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Credit Purchase for Pro and Ultra subscribers */}
            {subscriptionTier && subscriptionTier !== 'free' && (
              <CreditPurchase 
                subscriptionTier={subscriptionTier}
                isLoading={isProcessingCredits}
                onPurchase={handlePurchaseCredits}
              />
            )}
          </div>
          
          {/* Subscription Plans */}
          <SubscriptionPlans 
            currentPlan={subscriptionTier}
            credits={credits}
            onSelectPlan={handleSelectPlan}
            isLoading={isUpgrading}
            subscriptionStatus={subscriptionStatus}
          />
        </motion.div>
      </div>
    </div>
  );
}