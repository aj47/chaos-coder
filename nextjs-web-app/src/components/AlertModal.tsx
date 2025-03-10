"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'auth' | 'credits' | 'downgrade';
  onConfirm?: () => void;
}

export function AlertModal({ isOpen, onClose, title, message, type, onConfirm }: AlertModalProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  if (!isOpen) return null;
  
  const handleSignIn = async () => {
    // Show the AuthModal instead of navigating
    setShowAuthModal(true);
  };
  
  const handleSubscribe = () => {
    router.push('/pricing');
    onClose();
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };
  
  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        aria-modal="true"
        role="dialog"
        aria-labelledby="alert-modal-title"
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
            aria-label="Close alert modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          
          <div className="flex items-center mb-4">
            <div className={`p-2 rounded-full mr-3 ${
              type === 'auth' 
                ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-600')
                : type === 'credits'
                ? (theme === 'dark' ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-600')
                : (theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-600')
            }`}>
              {type === 'auth' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ) : type === 'credits' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              )}
            </div>
            <h2 id="alert-modal-title" className="text-xl font-bold">{title}</h2>
          </div>
          
          <p className="mb-6">{message}</p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={type === 'auth' ? handleSignIn : type === 'credits' ? handleSubscribe : handleConfirm}
              className={`py-2 px-4 rounded-lg font-medium flex-1 ${
                type === 'downgrade'
                  ? theme === 'dark'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                  : theme === 'dark'
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white'
              }`}
            >
              {type === 'auth' ? 'Sign In' : type === 'credits' ? 'Subscribe' : 'Confirm Downgrade'}
            </button>
            
            <button
              onClick={onClose}
              className={`py-2 px-4 rounded-lg font-medium flex-1 ${
                theme === 'dark'
                  ? 'bg-gray-800 hover:bg-gray-700 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Show AuthModal when clicking Sign In */}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            onClose(); // Close the alert modal too
          }}
          mode="login"
        />
      )}
    </>
  );
} 