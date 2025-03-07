"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { createClient } from "@/lib/supabase/client";
import { FcGoogle } from "react-icons/fc";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "login" | "signup";
}

export function AuthModal({ isOpen, onClose, mode }: AuthModalProps) {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("User");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  
  useEffect(() => {
    if (isOpen) {
      console.log(`[DEBUG] AuthModal opened in ${mode} mode`);
    }
  }, [isOpen, mode]);
  
  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    console.log(`[DEBUG] Starting ${mode} with email:`, email);
    
    try {
      const supabase = createClient();
      
      if (mode === "login") {
        console.log("[DEBUG] Attempting to sign in with password");
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        console.log("[DEBUG] Login successful, session:", data.session?.user.id);
        console.log("[DEBUG] Session expires at:", new Date(data.session!.expires_at! * 1000).toISOString());
        console.log("[DEBUG] Access token:", data.session?.access_token?.substring(0, 10) + "...");
        console.log("[DEBUG] Refresh token exists:", !!data.session?.refresh_token);
        
        // Log all cookies to see if auth cookie is set
        setTimeout(() => {
          console.log("[DEBUG] Cookies after login:", document.cookie);
          
          // Check if auth cookie exists
          const hasAuthCookie = document.cookie.includes('sb-xskelhjnymrbogeloxfy-auth-token');
          console.log("[DEBUG] Auth cookie exists after login:", hasAuthCookie);
          
          if (!hasAuthCookie) {
            console.log("[DEBUG] Auth cookie not found, manually setting it");
            // If cookie doesn't exist, try to manually set it
            document.cookie = `sb-xskelhjnymrbogeloxfy-auth-token=${JSON.stringify([data.session?.access_token, data.session?.refresh_token])}; path=/; max-age=604800; SameSite=Lax`;
          }
        }, 100);
        
        setMessage({ type: "success", text: "Login successful!" });
        
        // Close the modal after a short delay to allow the session to be set
        setTimeout(() => {
          console.log("[DEBUG] Closing modal and reloading page");
          onClose();
          
          // Force a hard refresh to ensure the auth state is updated everywhere
          window.location.href = window.location.href;
        }, 500);
      } else {
        // No need to validate firstName since it's a hidden field with default value
        console.log("[DEBUG] Attempting to sign up with email:", email);
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              // Always use "User" as the first name if not provided
              first_name: firstName.trim() || "User",
            },
            // Ensure the email redirect URL is correct
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        
        if (error) throw error;
        
        // Store first name in localStorage as a backup
        localStorage.setItem('firstName', firstName);
        
        console.log("[DEBUG] Signup successful, user:", data.user?.id);
        console.log("[DEBUG] Email confirmation needed:", !data.session);
        
        setMessage({ 
          type: "success", 
          text: "Check your email for the confirmation link!" 
        });
      }
    } catch (error: unknown) {
      console.error("[DEBUG] Auth error:", error);
      setMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "An error occurred during authentication" 
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setMessage(null);
    
    console.log("[DEBUG] Starting Google OAuth flow");
    
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      });
      
      if (error) throw error;
      
      console.log("[DEBUG] Google auth initiated, URL:", data.url?.substring(0, 30) + "...");
      // No need to set success message as we're redirecting to Google
    } catch (error: unknown) {
      console.error("[DEBUG] Google auth error:", error);
      setMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "An error occurred during Google authentication" 
      });
    } finally {
      setGoogleLoading(false);
    }
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`relative w-full max-w-md p-6 rounded-xl shadow-2xl ${
          theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className={`absolute top-4 right-4 p-1 rounded-full ${
            theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <h2 className="text-xl font-bold mb-4">
          {mode === "login" ? "Log In" : "Sign Up"}
        </h2>
        
        {message && (
          <div className={`p-3 mb-4 rounded-lg ${
            message.type === "error" 
              ? "bg-red-500/10 text-red-500" 
              : "bg-green-500/10 text-green-500"
          }`}>
            {message.text}
          </div>
        )}
        
        <div className="flex flex-col gap-4">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === "signup" && (
              <input
                id="firstName"
                type="hidden"
                value="User"
                onChange={(e) => setFirstName(e.target.value)}
              />
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className={`w-full p-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={`w-full p-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 px-4 rounded-lg font-medium flex items-center justify-center ${
                theme === 'dark'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white'
              } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                mode === "login" ? "Log In" : "Sign Up"
              )}
            </button>
          </form>
          
          {/* Add divider with "or" text */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className={`px-2 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                or
              </span>
            </div>
          </div>
          
          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={googleLoading}
            className={`w-full py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 ${
              theme === 'dark'
                ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
            } ${googleLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              <>
                <FcGoogle size={20} />
                <span>{mode === "login" ? "Continue with Google" : "Sign up with Google"}</span>
              </>
            )}
          </button>
          
          <div className="text-center text-sm mt-4">
            {mode === "login" ? (
              <p>
                Don&apos;t have an account?{" "}
                <button 
                  onClick={() => {
                    onClose();
                    setTimeout(() => {
                      const signupButton = document.querySelector('button[data-signup-button="true"]') as HTMLElement;
                      signupButton?.click();
                    }, 100);
                  }}
                  className="text-indigo-500 hover:underline"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <button 
                  onClick={() => {
                    onClose();
                    setTimeout(() => {
                      const loginButton = document.querySelector('button[data-login-button="true"]') as HTMLElement;
                      loginButton?.click();
                    }, 100);
                  }}
                  className="text-indigo-500 hover:underline"
                >
                  Log in
                </button>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
} 