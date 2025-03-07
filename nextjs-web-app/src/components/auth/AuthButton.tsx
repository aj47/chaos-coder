"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/context/ThemeContext";
import { AuthModal } from "./AuthModal";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export function AuthButton() {
  const { theme } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  
  useEffect(() => {
    const supabase = createClient();
    
    // Check current session
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user || null);
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };
  
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
        <div className="text-sm">
          <span className="opacity-70">Hello, </span>
          <span>{user.email?.split('@')[0] || 'User'}</span>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className={`py-2 px-4 rounded-lg text-sm font-medium ${
            theme === 'dark'
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-indigo-500 hover:bg-indigo-600 text-white'
          }`}
        >
          Dashboard
        </button>
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
      </div>
    );
  }
  
  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setShowLoginModal(true)}
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