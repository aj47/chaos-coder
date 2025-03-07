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
        
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        
        // Set the user from the session if it exists
        if (session) {
          console.log("[DEBUG] Session found, user ID:", session.user.id);
          console.log("[DEBUG] Session expires at:", new Date(session.expires_at! * 1000).toISOString());
          setUser(session.user);
        } else if (hasAuthCookie) {
          // If we have an auth cookie but no session, try to refresh the session
          console.log("[DEBUG] Auth cookie exists but no session, trying to refresh");
          const { data: refreshData } = await supabase.auth.refreshSession();
          
          if (refreshData.session) {
            console.log("[DEBUG] Session refreshed successfully, user ID:", refreshData.session.user.id);
            setUser(refreshData.session.user);
          } else {
            console.log("[DEBUG] Failed to refresh session despite having auth cookie");
            setUser(null);
          }
        } else {
          console.log("[DEBUG] No session found");
          setUser(null);
        }
      } catch (error) {
        console.error("[DEBUG] Error fetching session:", error);
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
        
        if (session) {
          console.log("[DEBUG] New session, expires at:", new Date(session.expires_at! * 1000).toISOString());
          // Log all cookies to see if auth cookie exists
          console.log("[DEBUG] Current cookies:", document.cookie);
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
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("[DEBUG] Error signing out:", error);
      } else {
        console.log("[DEBUG] User signed out successfully");
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