"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [firstName, setFirstName] = useState<string>("");

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (!data?.user) {
          router.push("/");
          return;
        }
        
        // Get first name from user metadata or localStorage
        const userFirstName = data.user.user_metadata?.first_name || localStorage.getItem('firstName') || "User";
        setFirstName(userFirstName);
        
        // If first name is in localStorage but not in metadata, update metadata
        if (!data.user.user_metadata?.first_name && localStorage.getItem('firstName')) {
          const storedFirstName = localStorage.getItem('firstName');
          if (storedFirstName) {
            try {
              await supabase.auth.updateUser({
                data: { first_name: storedFirstName }
              });
            } catch (updateError) {
              console.error("Error updating user metadata:", updateError);
              // Continue execution even if update fails
            }
          }
        }
      } catch (err) {
        console.error("Error checking user:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();
  }, [router]);

  const handleSignOut = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      // Clear localStorage on sign out
      localStorage.removeItem('firstName');
      router.push("/");
    } catch (err) {
      console.error("Error signing out:", err);
      setError(err instanceof Error ? err.message : "Error signing out");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-indigo-500 border-indigo-200 rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
        <div className={`w-full max-w-md p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow-md"}`}>
          <h2 className="text-xl font-bold mb-4">Error</h2>
          <p className="mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className={`w-full py-2 px-4 rounded-lg font-medium ${
              theme === "dark"
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-indigo-500 hover:bg-indigo-600 text-white"
            }`}
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <div className="flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className={`w-full md:w-64 md:min-h-screen p-4 ${theme === "dark" ? "bg-gray-800" : "bg-white shadow-md"}`}>
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm mt-2 opacity-75">Welcome, {firstName || "User"}</p>
          </div>
          
          <nav className="space-y-2" aria-label="Dashboard Navigation">
            <button 
              onClick={() => setActiveTab("overview")}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === "overview" 
                  ? theme === "dark" ? "bg-gray-700" : "bg-indigo-100 text-indigo-700" 
                  : theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
              }`}
              aria-current={activeTab === "overview" ? "page" : undefined}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab("billing")}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === "billing" 
                  ? theme === "dark" ? "bg-gray-700" : "bg-indigo-100 text-indigo-700" 
                  : theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
              }`}
              aria-current={activeTab === "billing" ? "page" : undefined}
            >
              Billing & Credits
            </button>
            <button 
              onClick={() => setActiveTab("settings")}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === "settings" 
                  ? theme === "dark" ? "bg-gray-700" : "bg-indigo-100 text-indigo-700" 
                  : theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
              }`}
              aria-current={activeTab === "settings" ? "page" : undefined}
            >
              Settings
            </button>
          </nav>
          
          <div className="mt-auto pt-8">
            <button 
              onClick={handleSignOut}
              className={`w-full px-4 py-2 rounded-lg transition-colors ${
                theme === "dark" 
                  ? "bg-gray-700 hover:bg-gray-600" 
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Sign Out
            </button>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 p-6">
          {activeTab === "overview" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-bold">Overview</h2>
              <div className={`p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow-md"}`}>
                <p>Welcome to your dashboard! Here you can manage your account and see your usage statistics.</p>
              </div>
            </motion.div>
          )}
          
          {activeTab === "billing" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-bold">Billing & Credits</h2>
              <div className={`p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow-md"}`}>
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Current Plan</h3>
                  <div className={`p-4 rounded-lg border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold">Free Plan</p>
                        <p className="text-sm opacity-75">25 generations per month</p>
                      </div>
                      <button 
                        className={`px-4 py-2 rounded-lg font-medium ${
                          theme === "dark"
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                            : "bg-indigo-500 hover:bg-indigo-600 text-white"
                        }`}
                      >
                        Upgrade
                      </button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Available Credits</h3>
                  <div className={`p-4 rounded-lg border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold">15 / 25</p>
                        <p className="text-sm opacity-75">Credits remaining this month</p>
                      </div>
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full" 
                          style={{ width: "60%" }}
                          role="progressbar"
                          aria-valuenow={60}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {activeTab === "settings" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-bold">Settings</h2>
              <div className={`p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow-md"}`}>
                <form className="space-y-4">
                  <div>
                    <label htmlFor="displayName" className="block mb-1 text-sm font-medium">
                      Display Name
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      className={`w-full p-2 rounded-lg border ${
                        theme === 'dark' 
                          ? 'bg-gray-800 border-gray-700 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      defaultValue={firstName}
                    />
                  </div>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-lg font-medium ${
                      theme === "dark"
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                        : "bg-indigo-500 hover:bg-indigo-600 text-white"
                    }`}
                  >
                    Save Changes
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
} 