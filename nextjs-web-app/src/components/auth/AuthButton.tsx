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
  const { user, tokens, isLoading } = useAuth();

  // User is still loading
  if (isLoading) {
    return (
      <div
        className={`py-2 px-4 rounded-lg text-sm font-medium ${
          theme === "dark"
            ? "bg-gray-800 text-gray-300"
            : "bg-gray-200 text-gray-700"
        }`}
      >
        Loading...
      </div>
    );
  }

  // User is logged in
  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span
            className={`flex text-xs ${
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {tokens} 
            <Image src="/coin.png" alt="Credits" width={16} height={16} className="ml-1"/>
          </span>
        </div>

        {pathname === "/dashboard" ? (
          <button
            onClick={() => router.push("/")}
            className={`py-2 px-4 rounded-lg text-sm font-medium ${
              theme === "dark"
                ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            }`}
          >
            Home
          </button>
        ) : (
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
