"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/context/ThemeContext";
import { AuthModal } from "./AuthModal";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

export function AuthButton() {
  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  
  useEffect(() => {
    console.log("[DEBUG] AuthButton mounted, initializing auth state");
    
    // Initialize Supabase client
    const supabase = createClient();
    
    // Check current session and set up auth state listener
    const setupAuth = async () => {
      try {
        console.log("[DEBUG] Checking current session");
        
        // Check if auth cookie exists directly
        const hasAuthCookie = document.cookie.includes('sb-xskelhjnymrbogeloxfy-auth-token');
        console.log("[DEBUG] Auth cookie exists in document.cookie:", hasAuthCookie);
        
        // Parse and log auth cookie content for debugging (safely)
        if (hasAuthCookie) {
          try {
            const cookies = document.cookie.split(';');
            const authCookieStr = cookies.find(c => c.trim().startsWith('sb-xskelhjnymrbogeloxfy-auth-token='));
            if (authCookieStr) {
              console.log("[DEBUG] Auth cookie length:", authCookieStr.length);
              
              // The cookie value is URL-encoded, so we need to decode it first
              const cookieValue = authCookieStr.split('=')[1];
              const decodedValue = decodeURIComponent(cookieValue);
              
              console.log("[DEBUG] Auth cookie decoded length:", decodedValue.length);
              console.log("[DEBUG] Auth cookie format valid:", decodedValue.startsWith('[') && decodedValue.endsWith(']'));
              console.log("[DEBUG] Auth cookie first 20 chars:", decodedValue.substring(0, 20));
            }
          } catch (cookieError) {
            console.error("[DEBUG] Error parsing auth cookie:", cookieError);
          }
        }
        
        // Get the current session
        console.log("[DEBUG] Calling supabase.auth.getSession()");
        const sessionResult = await supabase.auth.getSession();
        console.log("[DEBUG] getSession result:", sessionResult.data ? "Data received" : "No data", 
                    "Error:", sessionResult.error ? sessionResult.error.message : "None");
        
        const { data: { session } } = sessionResult;
        
        // Set the user from the session if it exists
        if (session) {
          console.log("[DEBUG] Session found, user ID:", session.user.id);
          console.log("[DEBUG] Session expires at:", new Date(session.expires_at! * 1000).toISOString());
          console.log("[DEBUG] Access token (first 10 chars):", session.access_token.substring(0, 10) + "...");
          console.log("[DEBUG] Refresh token exists:", !!session.refresh_token);
          console.log("[DEBUG] User email:", session.user.email);
          console.log("[DEBUG] User metadata:", JSON.stringify(session.user.user_metadata));
          setUser(session.user);
        } else if (hasAuthCookie) {
          // If we have an auth cookie but no session, try to refresh the session
          console.log("[DEBUG] Auth cookie exists but no session, trying to refresh");
          console.log("[DEBUG] Calling supabase.auth.refreshSession()");
          const refreshResult = await supabase.auth.refreshSession();
          console.log("[DEBUG] refreshSession result:", refreshResult.data ? "Data received" : "No data", 
                      "Error:", refreshResult.error ? refreshResult.error.message : "None");
          
          const { data: refreshData } = refreshResult;
          
          if (refreshData.session) {
            console.log("[DEBUG] Session refreshed successfully, user ID:", refreshData.session.user.id);
            console.log("[DEBUG] Refreshed session expires at:", new Date(refreshData.session.expires_at! * 1000).toISOString());
            setUser(refreshData.session.user);
          } else {
            console.log("[DEBUG] Failed to refresh session despite having auth cookie");
            console.log("[DEBUG] This might indicate a cookie format issue or server-side session expiration");
            setUser(null);
          }
        } else {
          console.log("[DEBUG] No session found and no auth cookie exists");
          setUser(null);
        }
      } catch (error) {
        console.error("[DEBUG] Error fetching session:", error);
        console.error("[DEBUG] Error details:", error instanceof Error ? error.message : String(error));
        console.error("[DEBUG] Error stack:", error instanceof Error ? error.stack : "No stack trace");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    // Call the setup function
    setupAuth();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        console.log("[DEBUG] Auth state changed:", event, session?.user?.id);
        console.log("[DEBUG] Auth change timestamp:", new Date().toISOString());
        
        if (session) {
          console.log("[DEBUG] New session, expires at:", new Date(session.expires_at! * 1000).toISOString());
          // Log all cookies to see if auth cookie exists
          console.log("[DEBUG] Current cookies:", document.cookie);
          
          // Check if auth cookie exists after auth state change
          const hasAuthCookie = document.cookie.includes('sb-xskelhjnymrbogeloxfy-auth-token');
          console.log("[DEBUG] Auth cookie exists after auth state change:", hasAuthCookie);
        } else {
          console.log("[DEBUG] Session is null after auth state change event:", event);
        }
        
        setUser(session?.user || null);
      }
    );
    
    // Clean up subscription on unmount
    return () => {
      console.log("[DEBUG] AuthButton unmounting, cleaning up subscription");
      subscription.unsubscribe();
    };
  }, []);
  
  const handleLogout = async () => {
    try {
      console.log("[DEBUG] Logging out user");
      const supabase = createClient();
      
      // Before logout, check if auth cookie exists and log its format
      const hasAuthCookie = document.cookie.includes('sb-xskelhjnymrbogeloxfy-auth-token');
      console.log("[DEBUG] Auth cookie exists before logout:", hasAuthCookie);
      
      if (hasAuthCookie) {
        try {
          const cookies = document.cookie.split(';');
          const authCookieStr = cookies.find(c => c.trim().startsWith('sb-xskelhjnymrbogeloxfy-auth-token='));
          if (authCookieStr) {
            console.log("[DEBUG] Auth cookie length before logout:", authCookieStr.length);
          }
        } catch (cookieError) {
          console.error("[DEBUG] Error parsing auth cookie before logout:", cookieError);
        }
      }
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("[DEBUG] Error signing out:", error);
      } else {
        console.log("[DEBUG] User signed out successfully");
        
        // After logout, check if auth cookie still exists
        const hasAuthCookieAfter = document.cookie.includes('sb-xskelhjnymrbogeloxfy-auth-token');
        console.log("[DEBUG] Auth cookie exists after logout:", hasAuthCookieAfter);
        
        // If cookie still exists, try to manually remove it
        if (hasAuthCookieAfter) {
          console.log("[DEBUG] Auth cookie still exists after logout, trying to manually remove it");
          document.cookie = "sb-xskelhjnymrbogeloxfy-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
        
        // Force a page reload to ensure all auth state is cleared
        window.location.reload();
      }
      // The auth state listener will update the user state
    } catch (error) {
      console.error("[DEBUG] Error signing out:", error);
    }
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log("[DEBUG] Settings button clicked, navigating to dashboard");
    // Use direct navigation instead of router.push to ensure a full page navigation
    window.location.href = "/dashboard";
  };
  
  if (loading) {
    return (
      <div className="flex gap-2">
        <div className="w-24 h-10 rounded-lg bg-gray-700/20 animate-pulse"></div>
      </div>
    );
  }
  
  if (user) {
    console.log("[DEBUG] Rendering logged-in state for user:", user.id);
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={handleLogout}
          className={`py-2 px-4 rounded-lg text-sm font-medium ${
            theme === 'dark'
              ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          Log Out
        </button>
        <button
          onClick={handleSettingsClick}
          className={`py-2 px-4 rounded-lg text-sm font-medium ${
            theme === 'dark'
              ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          Settings
        </button>
      </div>
    );
  }
  
  console.log("[DEBUG] Rendering logged-out state");
  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setShowLoginModal(true)}
          data-login-button="true"
          className={`py-2 px-4 rounded-lg text-sm font-medium ${
            theme === 'dark'
              ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          Log In
        </button>
        <button
          onClick={() => setShowSignupModal(true)}
          data-signup-button="true"
          className={`py-2 px-4 rounded-lg text-sm font-medium ${
            theme === 'dark' 
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
              : 'bg-indigo-500 hover:bg-indigo-600 text-white'
          }`}
        >
          Sign Up
        </button>
      </div>
      
      <AuthModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        mode="login" 
      />
      
      <AuthModal 
        isOpen={showSignupModal} 
        onClose={() => setShowSignupModal(false)} 
        mode="signup" 
      />
    </>
  );
} 