"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { createClient } from "@/lib/supabase/client";

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignupModal({ isOpen, onClose }: SignupModalProps) {
  const { theme } = useTheme();
  
  if (!isOpen) return null;
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
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
        
        <h2 className="text-xl font-bold mb-4">Free Limit Reached</h2>
        <p className="mb-6">You&apos;ve reached the limit of 25 free generations. Create an account to continue using our service.</p>
        
        <div className="flex flex-col gap-4">
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const email = String(formData.get('email'));
              const password = String(formData.get('password'));
              const supabase = createClient();
              
              try {
                const { error } = await supabase.auth.signUp({
                  email,
                  password,
                  options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`
                  }
                });
                
                if (error) {
                  alert(error.message);
                } else {
                  alert("Check your email for the confirmation link!");
                  onClose();
                }
              } catch (error) {
                console.error("Error signing up:", error);
                alert("An error occurred during sign up. Please try again.");
              }
            }}
          >
            <input
              name="email"
              type="email"
              placeholder="Enter your email"
              className={`w-full mb-4 p-2 rounded-lg border ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Enter your password"
              className={`w-full mb-4 p-2 rounded-lg border ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              required
            />
            <button
              type="submit"
              className={`w-full py-2 px-4 rounded-lg font-medium ${
                theme === 'dark'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white'
              }`}
            >
              Sign Up
            </button>
          </form>
          <button 
            onClick={onClose}
            className={`w-full py-2 px-4 rounded-lg font-medium ${
              theme === 'dark'
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Maybe Later
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
