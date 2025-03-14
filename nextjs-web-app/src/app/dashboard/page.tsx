"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { AuthService } from "@/lib/auth";
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
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Add refs to track latest values without causing re-renders
  const latestCredits = useRef<number | null>(null);
  const latestTokens = useRef<number>(tokens);
  const latestSubscriptionTier = useRef<string>(subscriptionTier);
  const latestSubscriptionStatus = useRef<string | null>(subscriptionStatus);

  // Update refs when values change
  useEffect(() => {
    latestCredits.current = credits;
  }, [credits]);

  useEffect(() => {
    latestTokens.current = tokens;
  }, [tokens]);

  useEffect(() => {
    latestSubscriptionTier.current = subscriptionTier;
  }, [subscriptionTier]);

  useEffect(() => {
    latestSubscriptionStatus.current = subscriptionStatus;
  }, [subscriptionStatus]);

  // Effect to check auth and load profile data
  useEffect(() => {
    if (!user && !isLoading) {
      router.push("/");
      return;
    }

    if (!user || isLoading) {
      return;
    }

    // Set email and welcome message
    setUserEmail(user.email || null);
    
    // Check if this is a new login
    const isNewLogin = !sessionStorage.getItem('dashboard_visited');
    if (isNewLogin) {
      setSuccessMessage(`Welcome back, ${user.email}!`);
      sessionStorage.setItem('dashboard_visited', 'true');
      setTimeout(() => setSuccessMessage(null), 5000);
    }

    // Load user profile data
    const loadProfileData = async () => {
      try {
        setLoading(true);
        
        const supabase = AuthService.createClient();
        
        // Get full profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          console.error("Error fetching profile:", profileError);
          setError("Could not load profile data");
        } else if (profileData) {
          const profile = profileData as unknown as {
            credits: number;
            subscription_tier?: string;
            subscription_status?: string;
          };
          
          setCredits(profile.credits);
          setTokens(profile.credits);
          setSubscriptionTier(profile.subscription_tier || "free");
          setSubscriptionStatus(profile.subscription_status || null);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        setError("An error occurred while loading your profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();

    // Cleanup
    return () => {
      if (window.location.pathname !== '/dashboard') {
        sessionStorage.removeItem('dashboard_visited');
      }
    };
  }, [user, isLoading, router, setTokens]);

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
    // Add additional properties that might be accessed
    [key: string]: any;
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
      
      // Use indexer to avoid type error
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

    console.log(`🔍 Checking URL parameters:`, {
      sessionId,
      creditsPurchased,
      purchasedAmount,
      planType
    });

    if (sessionId && creditsPurchased === 'true' && purchasedAmount) {
      console.log(`✅ Credit purchase success detected: ${purchasedAmount} credits`);
      setSuccessMessage(`Payment successful! ${purchasedAmount} credits have been added to your account.`);
      
      // Remove the parameters from the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      console.log(`🔄 URL parameters removed, new URL: ${newUrl}`);
      
      // Refresh profile data immediately instead of reloading the page
      console.log(`🔄 Refreshing user profile after credit purchase`);
      refreshUserProfile().then(() => {
        console.log(`✅ Profile refresh completed after credit purchase`);
        // Hide success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      });
    } else if (sessionId && planType) {
      // Handle plan upgrade success
      const planName = planType.toLowerCase();
      console.log(`✅ Plan upgrade success detected: ${planName}`);
      setSuccessMessage(`Payment successful! Your subscription has been upgraded to ${planName.toUpperCase()}.`);
      
      // Update the UI immediately to reflect the upgrade
      console.log(`🔄 Updating UI to reflect plan upgrade to ${planName}`);
      console.log(`📊 Current subscription tier: ${subscriptionTier}`);
      setSubscriptionTier(planName);
      setSubscriptionStatus('active');
      console.log(`📊 Updated subscription tier: ${planName}`);
      
      // Remove the session_id from the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      console.log(`🔄 URL parameters removed, new URL: ${newUrl}`);
      
      // Refresh profile data immediately instead of reloading the page
      console.log(`🔄 Refreshing user profile after plan upgrade`);
      refreshUserProfile().then(() => {
        console.log(`✅ Profile refresh completed after plan upgrade`);
        console.log(`📊 Final subscription tier after refresh: ${subscriptionTier}`);
        // Hide success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      });
    } else if (sessionId) {
      console.log(`✅ Generic payment success detected`);
      setSuccessMessage("Payment successful! Your subscription has been updated.");
      
      // Remove the session_id from the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      console.log(`🔄 URL parameters removed, new URL: ${newUrl}`);
      
      // Refresh profile data immediately instead of reloading the page
      console.log(`🔄 Refreshing user profile after payment`);
      refreshUserProfile().then(() => {
        console.log(`✅ Profile refresh completed after payment`);
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
      setError(null);
      
      // Check if we have a valid session before making the API call
      const supabase = AuthService.createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      console.log(`🔍 Session check before API call:`, {
        hasSession: !!sessionData?.session,
        sessionError: sessionError?.message || 'none',
        sessionExpiry: sessionData?.session?.expires_at ? new Date(sessionData.session.expires_at * 1000).toISOString() : 'none',
        currentTime: new Date().toISOString(),
        isExpired: sessionData?.session?.expires_at ? (sessionData.session.expires_at * 1000) < Date.now() : false
      });
      
      if (sessionError || !sessionData.session) {
        console.error(`❌ Session error:`, sessionError);
        setError("You must be logged in to upgrade your plan");
        setIsUpgrading(false);
        return;
      }

      // Get the current user to verify authentication
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        console.error(`❌ User verification failed:`, {
          error: userError?.message || 'No user data',
          userData: userData || null
        });
        setError("Could not verify your user account");
        setIsUpgrading(false);
        return;
      }
      
      // Check if this is a downgrade request
      const isDowngrade = plan.includes(':downgrade');
      const targetPlan = isDowngrade ? plan.split(':')[0] : plan;
      
      if (isDowngrade) {
        // For downgrades, use the downgrade API endpoint
        const response = await fetch('/api/stripe/downgrade', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            // Using the access token directly in the Authorization header
            'Authorization': `Bearer ${sessionData.session.access_token}`
          },
          credentials: 'include',
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Downgrade API error:', errorData);
          throw new Error(errorData.error || `HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
          // Refresh the profile to show updated subscription status
          await refreshUserProfile();
          setSuccessMessage(data.message || 'Your subscription has been cancelled successfully.');
          setTimeout(() => setSuccessMessage(null), 5000);
        }
      } else {
        // For upgrades, use the regular checkout process
        console.log(`🔄 Starting Stripe checkout process for tier: ${targetPlan}`);
        
        // Request body
        const requestBody = { 
          tier: targetPlan,
          userId: userData.user.id,
          userEmail: userData.user.email || '',
        };
        
        // Make the API call with credentials and proper auth header
        const response = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`
          },
          credentials: 'include',
          body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("No checkout URL returned");
        }
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to process your request. Please try again later.');
      setIsUpgrading(false);
    }
  };

  const handlePurchaseCredits = async (creditAmount: number) => {
    try {
      setIsProcessingCredits(true);
      setError(null); // Clear any previous errors
      
      // Get access token from current session
      const supabase = AuthService.createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData?.session?.access_token) {
        console.error('No valid session found for credit purchase:', sessionError);
        setError('No valid session found. Please log in again.');
        setIsProcessingCredits(false);
        return;
      }
      
      const accessToken = sessionData.session.access_token;
      
      // Get the user data for verification
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        console.error('User verification failed for credit purchase:', userError);
        setError('Could not verify your user account');
        setIsProcessingCredits(false);
        return;
      }
      
      // Log request details for debugging
      console.log(`🔄 Sending credit purchase request:`, {
        creditAmount,
        userId: userData.user.id,
        userEmail: userData.user.email
      });
      
      // Request body
      const requestBody = {
        amount: creditAmount // This is CREDITS, not dollars
      };
      
      // Create Stripe checkout session for credit purchase
      const response = await fetch('/api/stripe/credits', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        credentials: 'include', // Include cookies for additional auth context
        body: JSON.stringify(requestBody),
      });
      
      // Log response details
      console.log(`📥 Credit purchase response:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ Credit purchase API error:`, {
          status: response.status,
          error: errorData.error || 'Unknown error',
          timestamp: new Date().toISOString()
        });
        throw new Error(errorData.error || 'Failed to create checkout session');
      }
      
      const { url } = await response.json();
      
      // Redirect to checkout
      if (url) {
        console.log(`✅ Credit purchase checkout URL created:`, {
          url: url.substring(0, 50) + '...',
          timestamp: new Date().toISOString()
        });
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Credit purchase error:', err);
      setError(`Failed to start checkout process: ${err instanceof Error ? err.message : 'Please try again later.'}`);
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
        setError(error instanceof Error ? error.message : "Authentication error");
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
    console.log(`🔄 Starting user profile refresh...`);
    
    try {
      setLoading(true);
      
      // Get the user's profile data using the existing getUserData function
      const userData = await getUserData();
      if (!userData) {
        console.log(`⚠️ No user data found during refresh`);
        setLoading(false);
        return;
      }
      
      console.log(`✅ User data found, fetching profile for: ${userData.id}`);
      const supabase = AuthService.createClient();
      
      // Fetch latest user profile from database
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.id)
        .single();
      
      if (profileError) {
        console.error('❌ Error fetching user profile:', profileError);
        setError('Failed to load profile data');
        return;
      }
      
      if (!profileData) {
        console.log(`⚠️ No profile data found during refresh`);
        return;
      }
      
      console.log(`📊 Raw profile data from database:`, profileData);
      
      // Check if credits data is present
      if (profileData.credits !== undefined) {
        console.log(`💰 Credits found in profile: ${profileData.credits}`);
      } else {
        console.warn(`⚠️ No credits data in profile`);
      }
      
      // Check subscription tier
      if (profileData.subscription_tier) {
        console.log(`🔰 Subscription tier found: ${profileData.subscription_tier}`);
      } else {
        console.warn(`⚠️ No subscription tier in profile`);
      }
      
      // Update the state with the profile data
      console.log(`🔄 Updating state from profile...`);
      console.log(`📊 Before update - Credits: ${credits}, Tier: ${subscriptionTier}, Status: ${subscriptionStatus}`);
      
      updateStateFromProfile({
        credits: profileData.credits,
        subscription_tier: profileData.subscription_tier || undefined,
        subscription_status: profileData.subscription_status || undefined,
        email: profileData.email || undefined
      });
      
      console.log(`📊 After update - Credits: ${credits}, Tier: ${subscriptionTier}, Status: ${subscriptionStatus}`);
      
      // Check for checkout success
      const checkoutStatus = searchParams?.get('checkout');
      if (checkoutStatus === 'success') {
        console.log(`🎉 Checkout success detected in URL`);
        setSuccessMessage('Payment successful! Your account has been updated.');
        
        // Add a direct SQL query to check the user's subscription tier
        try {
          console.log(`🔍 Checking user's subscription tier after checkout success...`);
          const userData = await getUserData();
          if (userData) {
            const supabase = AuthService.createClient();
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('subscription_tier, subscription_status, credits')
              .eq('id', userData.id)
              .single();
            
            if (profileError) {
              console.error(`❌ Error fetching profile:`, profileError);
            } else {
              console.log(`📊 Current profile data after checkout:`, profileData);
            }
          }
        } catch (sqlError) {
          console.error(`❌ Exception in profile query:`, sqlError);
        }
        
        // Remove the checkout parameter from the URL
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('checkout');
        router.replace(`/dashboard?${newParams.toString()}`);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('❌ Exception in refreshUserProfile:', err);
      setError('An error occurred while refreshing your profile');
      setLoading(false);
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
          
          {/* Subscription Plans UNDER DEV */}
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