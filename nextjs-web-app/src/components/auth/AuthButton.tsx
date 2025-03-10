"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/context/ThemeContext";
import { AuthModal } from "./AuthModal";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import { useTokenStore } from "@/store/useTokenStore";
import Image from "next/image";

export function AuthButton() {
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  
  // Use individual selectors to avoid creating new objects on each render
  const tokens = useTokenStore(state => state.tokens);
  const tokenLoading = useTokenStore(state => state.isLoading);
  const syncTokensWithDB = useTokenStore(state => state.syncTokensWithDB);

  // Fetch user profile and tokens from the database
  const fetchUserTokens = async (userId: string) => {
    try {
      console.log("AuthButton: Fetching tokens for user", userId);
      // Use the store's syncTokensWithDB function
      await syncTokensWithDB(userId);
    } catch (error) {
      console.error('Error in fetchUserTokens:', error);
    }
  };

  useEffect(() => {
    const supabase = createClient();

    // Check current session
    const checkUser = async () => {
      try {
        const {
          data: { user },
          error: userError
        } = await supabase.auth.getUser();

        // Don't treat missing session as an error - it's a normal state
        if (userError && userError.name !== 'AuthSessionMissingError') {
          console.error("Error fetching user:", userError);
          // Only sign out if it's not a missing session error
          await supabase.auth.signOut();
          setUser(null);
          return;
        }
        
        if (!user) {
          setUser(null);
          return;
        }

        // Verify the user exists in the database
        const { error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error("User profile not found:", profileError);
          // Sign out if profile doesn't exist
          await supabase.auth.signOut();
          setUser(null);
          return;
        }

        setUser(user);
        
        // If user is authenticated, fetch their tokens
        if (user) {
          await fetchUserTokens(user.id);
        }
      } catch (error) {
        // Only log actual errors, not missing session
        if (error instanceof Error && error.name !== 'AuthSessionMissingError') {
          console.error("Error fetching user:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setLoading(false);
          return;
        }

        try {
          // Verify the user exists in the database
          const { error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error("User profile not found during auth state change:", profileError);
            // Sign out if profile doesn't exist
            await supabase.auth.signOut();
            setUser(null);
            setLoading(false);
            return;
          }

          setUser(session.user);
          
          // Fetch tokens whenever auth state changes (login, signup, etc.)
          if (session.user) {
            await fetchUserTokens(session.user.id);
          }
        } catch (error) {
          console.error("Error in auth state change:", error);
          await supabase.auth.signOut();
          setUser(null);
        } finally {
          // Important: Also set loading to false here after auth state changes
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  console.log("Render state:", { user: user?.id, loading, tokens });

  // Force loading to false if we have a user but loading is still true
  // This is a safeguard to ensure the UI updates
  useEffect(() => {
    if (user && loading) {
      console.log("Force updating loading state to false since user is authenticated");
      setLoading(false);
    }
  }, [user, loading]);

  // Add an effect to force refresh tokens when the component is mounted and a user is present
  useEffect(() => {
    const refreshTokensFromDB = async () => {
      // Only refresh if tokens is 0 and we're not already loading
      if (user && tokens === 0 && !tokenLoading) { 
        await fetchUserTokens(user.id);
      }
    };
    
    refreshTokensFromDB();
  }, [user, tokens, tokenLoading]); // Include tokenLoading in dependencies

  if (loading) {
    return (
      <div className="flex gap-2">
        <div className="w-24 h-10 rounded-lg bg-gray-700/20 animate-pulse"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        {pathname !== "/dashboard" && (
          <div
            className={`py-2 px-4 rounded-lg text-sm font-medium flex items-center ${
              theme === "dark"
                ? "bg-gray-800 text-gray-300"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            <Image src="/coin.png" alt="Credits" width={16} height={16} className="mr-1" />
            <span>
              {/* Force display tokens regardless of loading state */}
              {tokens !== undefined && tokens !== null 
                ? `${tokens} credits` 
                : "0 credits"}
            </span>
          </div>
        )}
        <button
          onClick={() =>
            router.push(pathname === "/dashboard" ? "/" : "/dashboard")
          }
          className={`py-2 px-4 rounded-lg text-sm font-medium ${
            theme === "dark"
              ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
              : "bg-gray-200 hover:bg-gray-300 text-gray-700"
          }`}
        >
          {pathname === "/dashboard" ? "Return" : "Dashboard"}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setShowLoginModal(true)}
          data-login-button="true"
          className={`py-2 px-4 rounded-lg text-sm font-medium ${
            theme === "dark"
              ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
              : "bg-gray-200 hover:bg-gray-300 text-gray-700"
          }`}
        >
          Log In
        </button>
        <button
          onClick={() => setShowSignupModal(true)}
          data-signup-button="true"
          className={`py-2 px-4 rounded-lg text-sm font-medium ${
            theme === "dark"
              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
              : "bg-indigo-500 hover:bg-indigo-600 text-white"
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
