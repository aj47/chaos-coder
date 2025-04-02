"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { SignupModal } from "@/components/SignupModal";
import { FaPlus, FaMinus, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { MIN_NUM_GENERATIONS, MAX_NUM_GENERATIONS } from "@/context/GenerationsContext";
import { AlertModal } from "@/components/AlertModal";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { DESIGN_STYLES, DEFAULT_STYLES } from "@/config/styles";
import { motion, AnimatePresence } from "framer-motion";
import { AuthService } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { useGenerations } from "@/context/GenerationsContext";
import { User } from "@supabase/supabase-js";
import { ApiClient } from "@/lib/api-client";
import { useTheme } from "@/context/ThemeContext";

// Signup Modal Component
export function SignupModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const router = useRouter();
  
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
        <p className="mb-6">You've reached the limit of 25 free generations. Create an account to continue using our service.</p>
        
        <div className="flex flex-col gap-4">
          <a 
            href="https://docs.google.com/forms/d/e/1FAIpQLSdBUzzrsu74cJlRhZZVSQuYAcGZ4_8RKB-G7vYZGibU7S5T4g/viewform?usp=header"
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full py-2 px-4 rounded-lg font-medium text-center block ${
              theme === 'dark' 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                : 'bg-indigo-500 hover:bg-indigo-600 text-white'
            }`}
          >
            Sign Up
          </a>
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

export default function Home() {
  const router = useRouter();
  const { theme } = useTheme();
  const { numGenerations, incrementGenerations, decrementGenerations, setNumGenerations } = useGenerations();
  const [styles, setStyles] = useState<string[]>(DEFAULT_STYLES.slice(0, numGenerations));
  const [customStyles, setCustomStyles] = useState<string[]>(
    Array(numGenerations).fill("")
  );
  const [isStyleSettingsExpanded, setIsStyleSettingsExpanded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokens, setTokens] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{
    title: string;
    message: string;
    type: "auth" | "credits";
  }>({
    title: "",
    message: "",
    type: "auth",
  });

  // Token store state
  const { setTokens: setAuthTokens } = useAuth();

  // Animated gradient positions
  const [gradientPosition, setGradientPosition] = useState(0);

  // Check for user auth state on component mount
  useEffect(() => {
    const checkUser = async () => {
      try {
        // Use ApiClient instead of direct Supabase access
        const { data: userData, error } = await ApiClient.getCurrentUser();

        if (error) {
          console.error("Error checking user:", error);
          return;
        }

        // Update user session if user is logged in
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);

          // Sync tokens with database
          await syncTokensWithDB();
        }
      } catch (error) {
        console.error("Error in checkUser:", error);
      }
    };

    checkUser();
  }, []);

  // Update styles and customStyles when numGenerations changes
  useEffect(() => {
    setStyles(prev => {
      // If we need more styles than we currently have
      if (numGenerations > prev.length) {
        // Add new styles from DEFAULT_STYLES, cycling if needed
        const newStyles = [...prev];
        for (let i = prev.length; i < numGenerations; i++) {
          newStyles.push(DEFAULT_STYLES[i % DEFAULT_STYLES.length]);
        }
        return newStyles;
      }
      // If we need fewer styles
      else if (numGenerations < prev.length) {
        return prev.slice(0, numGenerations);
      }
      return prev;
    });

    setCustomStyles(prev => {
      // If we need more custom styles
      if (numGenerations > prev.length) {
        return [...prev, ...Array(numGenerations - prev.length).fill("")];
      }
      // If we need fewer custom styles
      else if (numGenerations < prev.length) {
        return prev.slice(0, numGenerations);
      }
      return prev;
    });
  }, [numGenerations]);

  // Animate the gradient
  useEffect(() => {
    const interval = setInterval(() => {
      setGradientPosition((prev) => (prev + 1) % 200);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Gradient animation styles
  const gradientStyle = {
    backgroundSize: "200% 200%",
    backgroundPosition: `${gradientPosition}% 50%`,
  };

  // Use the centralized design styles configuration
  const predefinedStyles = DESIGN_STYLES;

  // Handle auth refresh from redirects
  useEffect(() => {
    // Check if we have the auth_refresh query parameter
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const authRefresh = params.get('auth_refresh');
      const hardRefresh = params.get('hard_refresh');

      // Remove the query parameters without refreshing the page
      const url = new URL(window.location.href);
      url.searchParams.delete('auth_refresh');
      url.searchParams.delete('hard_refresh');
      window.history.replaceState({}, document.title, url.toString());

      // If hard refresh is requested, reload the page completely
      if (hardRefresh === 'true') {
        // Hard refresh requested
        window.location.reload();
        return;
      }

      if (authRefresh === 'true') {
        // Auth refresh detected

        // Force auth state check
        const checkUser = async () => {
          const { data: user } = await ApiClient.getCurrentUser();
          setUser(user);

          if (user) {
            await syncTokensWithDB();
          }
        };

        checkUser();
      }
    }
  }, []);

  // Handle style selection
  const handleStyleChange = (index: number, value: string) => {
    setStyles((current) => {
      const newStyles = [...current];
      newStyles[index] = value;
      return newStyles;
    });
  };

  // Handle custom style input
  const handleCustomStyleChange = (index: number, value: string) => {
    setCustomStyles((current) => {
      const newCustomStyles = [...current];
      newCustomStyles[index] = value;
      return newCustomStyles;
    });
  };

  // Function to sync tokens with the database
  const syncTokensWithDB = async () => {
    if (!user) return;

    try {
      const { data, error } = await ApiClient.getUserCredits();

      if (error) {
        console.error("Error syncing tokens with DB:", error);
        return;
      }

      if (data !== null) {
        setAuthTokens(data);
      }
    } catch (error) {
      console.error("Error syncing tokens with DB:", error);
    }
  };

  const handleSubmit = async () => {
    if (!prompt) {
      setErrorMessage("Please enter a prompt to generate web applications.");
      return;
    }

    // Start submission process

    setErrorMessage(null);
    setIsLoading(true);

    try {
      // Check auth before proceeding
      // Make a test request to check authentication and credits before redirecting
      const response = await fetch("/api/check-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.substring(0, 50), // Just send a small part of the prompt for the check
          numGenerations,
        }),
      });



      const responseData = await response.json();


      if (response.status === 401) {

        // Authentication required error
        setAlertInfo({
          title: "Authentication Required",
          message:
            "You need to sign in to generate web apps. Sign in to continue.",
          type: "auth",
        });
        setShowAlertModal(true);
        setIsLoading(false);
        return;
      }

      if (response.status === 402) {

        // Insufficient credits error
        setAlertInfo({
          title: "Insufficient Credits",
          message:
            "You don't have enough credits to generate these applications. Please check your dashboard to manage your credits.",
          type: "credits",
        });
        setShowAlertModal(true);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {

        throw new Error(`Unexpected response: ${response.status}`);
      }

      // After submission is complete, sync tokens with the database
      // to ensure the displayed token count is accurate
      if (user?.id) {

        await syncTokensWithDB();
      }


      const encodedPrompt = encodeURIComponent(prompt);
      const encodedConfig = encodeURIComponent(
        JSON.stringify({
          numGenerations,
          styles: styles.map((style, i) =>
            style === "custom" ? customStyles[i] : style
          ),
        })
      );


      router.push(`/results?prompt=${encodedPrompt}&config=${encodedConfig}`);
    } catch (error) {
      console.error('handleSubmit: Error occurred:', error);
      toast.error("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full">
      <div className="absolute top-4 right-4 z-50">
        {/* AuthButton component removed */}
      </div>
      {showAlertModal && (
        <AlertModal
          isOpen={showAlertModal}
          onClose={() => setShowAlertModal(false)}
          title={alertInfo.title}
          message={alertInfo.message}
          type={alertInfo.type}
        />
      )}
      {showSignupModal && (
        <SignupModal
          isOpen={showSignupModal}
          onClose={() => setShowSignupModal(false)}
        />
      )}
      <div className="relative z-10">
        <HeroGeometric
          badge=""
          title1="Chaos Coder"
          title2={`${numGenerations}x Dev`}
        >
          <div className="w-full max-w-3xl mx-auto mb-10">
            <div className="relative bg-[#1a1f2e]/80 backdrop-blur-xl rounded-2xl overflow-hidden border border-[#2a3040] shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]">
              <div className="relative p-6 z-10">
                {/* Prompt and Number of Websites Container */}
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  {/* Prompt Text Area */}
                  <div className="w-full md:flex-grow">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="E.g., A to-do list app with local storage and dark mode"
                      className="w-full h-32 p-4 bg-[#1a1f2e]/50 font-sans text-base
                             border border-[#2a3040] rounded-xl
                             focus:ring-2 focus:ring-[#3b82f6]/50 focus:border-transparent resize-none
                             placeholder:text-gray-400/70
                             text-gray-200"
                    />
                  </div>

                  {/* Number of Websites Control */}
                  <div className="w-full md:w-48 p-3 bg-[#1a1f2e]/30 border border-[#2a3040] rounded-lg self-start h-32 flex flex-col justify-around">
                    <div className="text-sm bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300 font-medium mb-2">
                      Number of Websites:
                    </div>
                    <div className="flex items-center justify-center">
                      <motion.button
                        onClick={decrementGenerations}
                        disabled={numGenerations <= MIN_NUM_GENERATIONS}
                        className={`p-2 rounded-lg bg-gradient-to-br from-[#1a1f2e]/90 to-[#141822]/90 border border-[#2a3040] ${numGenerations <= MIN_NUM_GENERATIONS ? 'opacity-50 cursor-not-allowed text-gray-600' : 'text-gray-400 hover:text-gray-200'} shadow-md`}
                        whileHover={numGenerations > MIN_NUM_GENERATIONS ? { scale: 1.05 } : undefined}
                        whileTap={numGenerations > MIN_NUM_GENERATIONS ? { scale: 0.95 } : undefined}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <FaMinus className="w-3 h-3" />
                      </motion.button>
                      <div className="mx-4 flex flex-col items-center">
                        <motion.div
                          className="text-4xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-rose-300 font-bold"
                          key={numGenerations}
                          initial={{ scale: 1.2, opacity: 0.7 }}
                          animate={{
                            scale: 1,
                            opacity: 1,
                          }}
                          transition={{ duration: 0.3 }}
                          style={gradientStyle}
                        >
                          {numGenerations}
                        </motion.div>
                      </div>
                      <motion.button
                        onClick={incrementGenerations}
                        disabled={numGenerations >= MAX_NUM_GENERATIONS}
                        className={`p-2 rounded-lg bg-gradient-to-br from-[#1a1f2e]/90 to-[#141822]/90 border border-[#2a3040] ${numGenerations >= MAX_NUM_GENERATIONS ? 'opacity-50 cursor-not-allowed text-gray-600' : 'text-gray-400 hover:text-gray-200'} shadow-md`}
                        whileHover={numGenerations < MAX_NUM_GENERATIONS ? { scale: 1.05 } : undefined}
                        whileTap={numGenerations < MAX_NUM_GENERATIONS ? { scale: 0.95 } : undefined}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <FaPlus className="w-3 h-3" />
                      </motion.button>
                    </div>
                  </div>
                </div>

                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-500/10 text-red-500 rounded-lg">
                    {errorMessage}
                  </div>
                )}

                {/* Generate Button - Moved above style settings */}
                <RainbowButton
                  className={`w-full ${isLoading ? 'opacity-90' : ''}`}
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center w-full">
                      <div className="relative mr-3">
                        <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-0 w-6 h-6 border-2 border-transparent border-r-indigo-400/80 rounded-full animate-spin animate-[spin_1s_linear_infinite_0.2s]"></div>
                        <div className="absolute top-[2px] left-[2px] w-[20px] h-[20px] border-2 border-transparent border-b-purple-400/60 rounded-full animate-spin animate-[spin_1.5s_linear_infinite_0.3s] origin-center"></div>
                      </div>
                      <span className="text-white font-medium bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-white animate-pulse">Generating...</span>
                    </div>
                  ) : (
                    <span className="flex items-center justify-center w-full">
                      Generate {numGenerations} Website{numGenerations > 1 ? 's' : ''} <span className="mx-1">•</span> (
                      <span className="flex items-center">
                        {numGenerations}
                          <Image
                            src="/coin.png"
                            alt="Credits"
                            width={16}
                            height={16}
                            className="ml-1"
                          />
                      </span>
                      )
                    </span>
                  )}
                </RainbowButton>

                {/* Collapsible Style Settings */}
                <div className="mb-4 mt-4">
                  <button
                    onClick={() => setIsStyleSettingsExpanded(!isStyleSettingsExpanded)}
                    className="w-full p-3 bg-[#1a1f2e]/30 border border-[#2a3040] rounded-lg flex justify-between items-center"
                  >
                    <div className="text-sm bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300 font-medium">
                      Style Settings
                    </div>
                    {isStyleSettingsExpanded ? (
                      <FaChevronUp className="text-gray-400" />
                    ) : (
                      <FaChevronDown className="text-gray-400" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isStyleSettingsExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 mt-2 bg-[#1a1f2e]/30 border border-[#2a3040] rounded-lg">
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {Array.from({ length: numGenerations }).map((_, index) => (
                              <motion.div
                                key={`settings-${index}`}
                                className="flex gap-2 p-2 bg-[#1a1f2e]/50 rounded-lg"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05, duration: 0.3 }}
                              >
                                <div className="flex-none text-xs text-gray-400 font-semibold pt-2 w-16">
                                  Site {index + 1}:
                                </div>

                                {/* Style Selection */}
                                <div className="flex-1">
                                  <select
                                    value={styles[index]}
                                    onChange={(e) => handleStyleChange(index, e.target.value)}
                                    className="w-full py-1 px-3 bg-[#1a1f2e]/70 border border-[#2a3040] rounded-lg text-sm text-gray-300"
                                  >
                                    {predefinedStyles.map((style) => (
                                      <option key={style.value} value={style.value}>
                                        {style.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Custom Style Input */}
                                {styles[index] === "custom" && (
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      value={customStyles[index]}
                                      onChange={(e) => handleCustomStyleChange(index, e.target.value)}
                                      placeholder="Enter custom style..."
                                      className="w-full py-1 px-3 bg-[#1a1f2e]/70 border border-[#2a3040] rounded-lg text-sm text-gray-300"
                                    />
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-4 text-center text-sm text-gray-400">
                  <p>
                    ❤️ 👨🏻‍💻 {" "}
                    <a
                      href="https://techfren.net"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      @techfren
                    </a>
                  </p>

                </div>
              </div>
            </div>
          </div>
        </HeroGeometric>
      </div>
    </div>
  );
}
