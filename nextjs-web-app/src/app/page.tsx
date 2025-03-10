"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { SignupModal } from "@/components/SignupModal";
import { FaPlus, FaMinus } from "react-icons/fa";
import { AlertModal } from "@/components/AlertModal";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { DESIGN_STYLES, DEFAULT_STYLES } from "@/config/styles";
import { motion } from "framer-motion";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [numGenerations, setNumGenerations] = useState(9);
  const [styles, setStyles] = useState<string[]>(DEFAULT_STYLES.slice(0, 9));
  const [customStyles, setCustomStyles] = useState<string[]>(
    Array(9).fill("")
  );
  const router = useRouter();

  // Use the centralized design styles configuration
  const predefinedStyles = DESIGN_STYLES;

  const [isLoading, setIsLoading] = useState(false);
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

  // Handle number of generations changes
  const incrementGenerations = () => {
    setNumGenerations((prev) => {
      const newNum = prev + 1;
      
      // Find the next unused style option
      setStyles((current) => {
        // If we've used all styles in DEFAULT_STYLES, start cycling through them
        if (newNum <= DEFAULT_STYLES.length) {
          // We still have unused default styles
          return DEFAULT_STYLES.slice(0, newNum);
        } else {
          // We need to cycle through the styles
          return [...current, DEFAULT_STYLES[(newNum - 1) % DEFAULT_STYLES.length]];
        }
      });
      
      setCustomStyles((current) => [...current, ""]);
      return newNum;
    });
  };

  const decrementGenerations = () => {
    if (numGenerations > 1) {
      setNumGenerations((prev) => {
        const newNum = prev - 1;
        // Remove style from the last generation
        setStyles((current) => current.slice(0, newNum));
        setCustomStyles((current) => current.slice(0, newNum));
        return newNum;
      });
    }
  };

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

  const handleSubmit = async () => {
    if (!prompt) {
      setErrorMessage("Please enter a prompt to generate web applications.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      // Make a test request to check authentication and credits before redirecting
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.substring(0, 50), // Just send a small part of the prompt for the check
          variation: "rate-limit-check",
          framework: "none",
        }),
      });

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
            "You don't have enough credits to generate these applications. Purchase more credits to continue.",
          type: "credits",
        });
        setShowAlertModal(true);
        setIsLoading(false);
        return;
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
      console.error("Error:", error);
      toast.error("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full">
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
        <HeroGeometric badge="" title1="Chaos Coder" title2="9x Dev">
          <div className="w-full max-w-3xl mx-auto">
            <div className="relative bg-[#1a1f2e]/80 backdrop-blur-xl rounded-2xl overflow-hidden border border-[#2a3040] shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]">
              <div className="relative p-6 z-10">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="E.g., A to-do list app with local storage and dark mode"
                  className="w-full h-32 p-4 bg-[#1a1f2e]/50 font-sans text-base
                         border border-[#2a3040] rounded-xl mb-4 
                         focus:ring-2 focus:ring-[#3b82f6]/50 focus:border-transparent resize-none
                         placeholder:text-gray-400/70
                         text-gray-200"
                />

                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-500/10 text-red-500 rounded-lg">
                    {errorMessage}
                  </div>
                )}

                <div className="mb-4">
                  {/* Configuration options */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left Column - Number of Generations */}
                    <div className="p-4 bg-[#1a1f2e]/30 border border-[#2a3040] rounded-lg">
                      <div className="text-sm text-gray-300 mb-3">
                        Number of Websites
                      </div>
                      <div className="flex items-center justify-center">
                        <motion.button
                          onClick={decrementGenerations}
                          className="p-3 rounded-lg bg-gradient-to-br from-[#1a1f2e]/90 to-[#141822]/90 border border-[#2a3040] text-gray-400 hover:text-gray-200 shadow-md"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          <FaMinus className="w-3 h-3" />
                        </motion.button>
                        <motion.div 
                          className="mx-6 text-2xl text-gray-200 font-medium"
                          key={numGenerations}
                          initial={{ scale: 1.2, opacity: 0.7 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          {numGenerations}
                        </motion.div>
                        <motion.button
                          onClick={incrementGenerations}
                          className="p-3 rounded-lg bg-gradient-to-br from-[#1a1f2e]/90 to-[#141822]/90 border border-[#2a3040] text-gray-400 hover:text-gray-200 shadow-md"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          <FaPlus className="w-3 h-3" />
                        </motion.button>
                      </div>
                    </div>

                    {/* Right Column - Style Settings */}
                    <div className="p-4 bg-[#1a1f2e]/30 border border-[#2a3040] rounded-lg">
                      <div className="text-sm text-gray-300 mb-3">
                        Style Settings
                      </div>
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
                  </div>
                </div>

                <RainbowButton
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 text-lg font-medium"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center">
                      Generate {numGenerations} Website{numGenerations > 1 ? 's' : ''} Now <span className="mx-1">•</span> (
                      <span className="flex items-center">
                        {numGenerations}
                          <Image
                            src="/coin.png"
                            alt="Credits"
                            width={16}
                            height={16}
                          />
                      </span>
                      )
                    </span>
                  )}
                </RainbowButton>

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
