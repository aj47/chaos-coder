"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/context/ThemeContext";
import { AuthModal } from "./AuthModal";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import {
  FiLogOut,
  FiSettings,
  FiLogIn,
  FiUserPlus,
  FiHome,
} from "react-icons/fi";

export function AuthButton() {
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Check current session
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
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
        <div
          className={`py-2 px-4 rounded-lg text-sm font-medium ${
            theme === "dark"
              ? "bg-gray-800/80 text-gray-300"
              : "bg-gray-200/80 text-gray-700"
          }`}
        >
          {user.email?.split("@")[0] || "User"}
        </div>
        {!isHomePage && (
          <button
            onClick={() => router.push("/")}
            className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white transition-all"
            title="Home"
          >
            <FiHome size={18} />
          </button>
        )}
        <button
          onClick={() => router.push("/settings")}
          className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white transition-all"
          title="Settings"
        >
          <FiSettings size={18} />
        </button>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white transition-all"
          title="Log Out"
        >
          <FiLogOut size={18} />
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
          className="flex items-center gap-2 py-2 px-5 rounded-full text-sm font-medium bg-gray-800/90 hover:bg-gray-700 text-gray-200"
        >
          <FiLogIn size={16} />
          Log In
        </button>
        <button
          onClick={() => setShowSignupModal(true)}
          data-signup-button="true"
          className="flex items-center gap-2 py-2 px-5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white transition-all"
        >
          <FiUserPlus size={16} />
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
