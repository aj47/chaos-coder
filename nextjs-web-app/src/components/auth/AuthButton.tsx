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
  const tokens = useTokenStore((state) => state.tokens);
  const setTokens = useTokenStore((state) => state.setTokens);

  // Fetch user profile and tokens from the database
  const fetchUserTokens = async (userId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user tokens:', error);
        return;
      }
      
      if (data && data.credits !== undefined) {
        // Update the token store with the user's credits from DB
        setTokens(data.credits);
      }
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
        } = await supabase.auth.getUser();
        setUser(user);
        
        // If user is authenticated, fetch their tokens
        if (user) {
          await fetchUserTokens(user.id);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
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
        setUser(session?.user || null);
        
        // Fetch tokens whenever auth state changes (login, signup, etc.)
        if (session?.user) {
          await fetchUserTokens(session.user.id);
        }
        
        // Important: Also set loading to false here after auth state changes
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Force loading to false if we have a user but loading is still true
  // This is a safeguard to ensure the UI updates
  useEffect(() => {
    if (user && loading) {
      setLoading(false);
    }
  }, [user, loading]);

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
            <span>{tokens} credits</span>
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
