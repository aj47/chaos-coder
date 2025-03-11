"use client";

import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { AuthModal } from "./AuthModal";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";

export function AuthButton() {
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  
  // Use our new auth context instead of zustand store
  const { user, tokens, isLoading, signOut } = useAuth();

  // Log out handler
  const handleLogout = async () => {
    await signOut();
    
    // If on a protected page, redirect to home
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/account')) {
      router.push('/');
    }
  };

  // User is still loading
  if (isLoading) {
    return (
      <div className={`py-2 px-4 rounded-lg text-sm font-medium ${
        theme === "dark"
          ? "bg-gray-800 text-gray-300"
          : "bg-gray-200 text-gray-700"
      }`}>
        Loading...
      </div>
    );
  }

  // User is logged in
  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span className={`text-sm font-medium ${
            theme === "dark" ? "text-gray-300" : "text-gray-700"
          }`}>
            {user.user_metadata.first_name || 'User'}
          </span>
          <span className={`text-xs ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}>
            {tokens} credits
          </span>
        </div>

        <div className="relative">
          {user.user_metadata.avatar_url ? (
            <Image
              src={user.user_metadata.avatar_url}
              alt="Profile"
              width={38}
              height={38}
              className="rounded-full"
            />
          ) : (
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium ${
              theme === "dark" 
                ? "bg-indigo-600 text-white" 
                : "bg-indigo-500 text-white"
            }`}>
              {(user.user_metadata.first_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
            </div>
          )}
        </div>

        {pathname !== "/dashboard" && (
          <button
            onClick={() => router.push("/dashboard")}
            className={`py-2 px-4 rounded-lg text-sm font-medium ${
              theme === "dark"
                ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            }`}
          >
            Dashboard
          </button>
        )}

        <button
          onClick={handleLogout}
          className={`py-2 px-4 rounded-lg text-sm font-medium ${
            theme === "dark"
              ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
              : "bg-gray-200 hover:bg-gray-300 text-gray-700"
          }`}
        >
          Logout
        </button>
      </div>
    );
  }

  // User is not logged in
  return (
    <>
      <div className="flex items-center gap-2">
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
