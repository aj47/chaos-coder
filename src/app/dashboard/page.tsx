import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/services/AuthService';
import { checkAndRefreshCredits } from '@/utils/checkAndRefreshCredits';

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [creditsRefreshed, setCreditsRefreshed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

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
        
        // Check if credits need refresh
        const { credits: refreshedCredits, refreshed } = await checkAndRefreshCredits(
          supabase,
          user.id
        );
        
        if (refreshed) {
          setCredits(refreshedCredits);
          setTokens(refreshedCredits);
          setCreditsRefreshed(true);
          setTimeout(() => setCreditsRefreshed(false), 5000);
        } else {
          // Get full profile
          try {
            // First try to get profile with subscription_tier
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('credits, subscription_tier, subscription_status')
              .eq('id', user.id)
              .single();
            
            if (profileError) {
              // If error is column doesn't exist, try without the problematic column
              if (profileError.code === '42703' && profileError.message?.includes('subscription_tier')) {
                console.log("Column subscription_tier doesn't exist, trying to fetch without it");
                
                // Try to fetch just credits
                const { data: basicProfileData, error: basicProfileError } = await supabase
                  .from('profiles')
                  .select('credits')
                  .eq('id', user.id)
                  .single();
                
                if (basicProfileError) {
                  console.error("Error fetching basic profile:", basicProfileError);
                  setError("Could not load profile data");
                } else if (basicProfileData) {
                  // Set default values for missing columns
                  setCredits(basicProfileData.credits);
                  setSubscriptionTier("free"); // Default to free tier
                  setSubscriptionStatus(null);
                  
                  // Try to fix the schema by calling our API endpoint
                  try {
                    const response = await fetch('/api/db-fix');
                    if (response.ok) {
                      console.log("Database schema fixed successfully");
                    } else {
                      console.error("Failed to fix database schema:", await response.json());
                    }
                  } catch (fixError) {
                    console.error("Error fixing database schema:", fixError);
                  }
                }
              } else {
                console.error("Error fetching profile:", profileError);
                setError("Could not load profile data");
              }
            } else if (profileData) {
              const profile = profileData as unknown as {
                credits: number;
                subscription_tier?: string;
                subscription_status?: string;
                max_daily_credits?: number;
              };
              
              setCredits(profile.credits);
              setSubscriptionTier(profile.subscription_tier || "free");
              setSubscriptionStatus(profile.subscription_status || null);
            }
          } catch (err) {
            console.error("Error in profile fetch:", err);
            setError("An error occurred while loading your profile");
          }
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

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default DashboardPage; 