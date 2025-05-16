"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { FaGoogle } from "react-icons/fa";
import { AuthService } from "@/lib/auth";

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignupModal({ isOpen, onClose }: SignupModalProps) {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {};
    
    if (!email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Email is invalid";
    }
    
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await AuthService.signupWithEmail(email, password);
      
      if (response.error) {
        setError(response.error.message);
        setIsLoading(false);
        return;
      }
      
      // Success - close modal and redirect or refresh
      onClose();
      window.location.href = "/dashboard"; // or handle with router
    } catch (err) {
            setError("An unexpected error occurred. Please try again.");
            setIsLoading(false);
            console.error(err);
          }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    
    try {
      const result = await AuthService.signInWithGoogle();
      
      if (result.error) {
        setError(result.error.message);
        setIsGoogleLoading(false);
        return;
      }
      
      // Success - close modal and redirect
      onClose();
      window.location.href = "/dashboard";
    } catch (err) {
            setError("An unexpected error occurred. Please try again.");
            setIsGoogleLoading(false);
            console.error(err);
          }
  };

  if (!isOpen) return null;
  
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
        exit={{ scale: 0.9, y: 20 }}
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
          aria-label="Close signup modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <h2 id="signup-modal-title" className="text-xl font-bold mb-4">Create Your Account</h2>
        <p className="mb-6">Sign up to continue generating web applications and unlock your full potential.</p>
        
        {error && (
          <div className={`p-3 mb-4 rounded-lg ${
            theme === 'dark' ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-800'
          }`}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="mb-4">
            <label htmlFor="email" className="block mb-1 text-sm font-medium">
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
              } ${formErrors.email ? 'border-red-500' : ''}`}
              aria-describedby={formErrors.email ? "email-error" : undefined}
              required
            />
            {formErrors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-500">
                {formErrors.email}
              </p>
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="password" className="block mb-1 text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              className={`w-full p-2 rounded-lg border ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } ${formErrors.password ? 'border-red-500' : ''}`}
              aria-describedby={formErrors.password ? "password-error" : undefined}
              required
            />
            {formErrors.password && (
              <p id="password-error" className="mt-1 text-sm text-red-500">
                {formErrors.password}
              </p>
            )}
          </div>
          
          <button
            type="submit"
            className={`w-full py-2 px-4 rounded-lg font-medium ${
              theme === 'dark'
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-indigo-500 hover:bg-indigo-600 text-white'
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </span>
            ) : (
              "Create Account"
            )}
          </button>
        </form>
        
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
        
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className={`w-full py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 ${
            theme === 'dark'
              ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
              : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
          }`}
        >
          {isGoogleLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </span>
          ) : (
            <>
              <FaGoogle className="text-red-500" size={20} />
              <span>Continue with Google</span>
            </>
          )}
        </button>
        
        <button 
          onClick={onClose}
          className={`w-full py-2 px-4 rounded-lg font-medium mt-2 ${
            theme === 'dark'
              ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          Maybe Later
        </button>
      </motion.div>
    </motion.div>
  );
}
