"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FaMicrophone, FaBolt } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import { GlowEffect } from "@/components/ui/glow-effect";
import { SignupModal } from "@/components/SignupModal";

interface PromptInputProps {
  isOpen: boolean;
  onSubmit: (
    prompt: string,
    isUpdate?: boolean,
    chaosMode?: boolean
  ) => Promise<unknown> | void;
  isUpdateMode?: boolean;
  currentCode?: string;
}

export default function PromptInput({
  onSubmit,
  isUpdateMode = false,
}: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [chaosMode, setChaosMode] = useState(true);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const { theme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      try {
        await onSubmit(prompt, isUpdateMode, chaosMode);
        setPrompt("");
      } catch (error: unknown) {
        console.error("Error submitting prompt:", error);

        // Check for rate limit error in the caught exception
        const err = error as {
          error?: string;
          response?: { status?: number };
          message?: string;
        };

        if (
          err?.error === "rate_limit_exceeded" ||
          (err.response && err.response.status === 429) ||
          (err.message && err.message.includes("rate limit"))
        ) {
          setShowSignupModal(true);
          return;
        }
      }
    }
  };

  return (
    <>
      {showSignupModal && (
        <SignupModal
          isOpen={showSignupModal}
          onClose={() => setShowSignupModal(false)}
        />
      )}
      <motion.div
        initial={{ y: 0, opacity: 1 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[600px] z-50"
      >
        <div className="relative p-2 rounded-xl backdrop-blur-xl bg-white/20 shadow-lg border border-white/30 overflow-hidden">
          {/* Glass background effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-white/10 pointer-events-none"></div>
          <form onSubmit={handleSubmit} className="flex gap-2 relative z-10">
            <div className="flex-1 relative overflow-hidden rounded-lg h-[40px]">
              {/* Animated glow border effect */}
              <div className="absolute inset-0 p-[1.5px] rounded-lg overflow-hidden">
                <GlowEffect
                  colors={["#0894FF", "#C959DD", "#FF2E54", "#FF9004"]}
                  mode="flowHorizontal"
                  blur="soft"
                  duration={3}
                />
              </div>

              <div
                className={`absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer z-50 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                <FaMicrophone className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  isUpdateMode
                    ? "Describe how to update the code..."
                    : "Type your prompt..."
                }
                className={`w-full h-full backdrop-blur-xl border-0 rounded-lg pl-10 pr-4 text-sm shadow-xl transition-all relative z-10 ${
                  theme === "dark"
                    ? "bg-gray-900/70 text-white placeholder:text-gray-300 focus:ring-blue-500/50"
                    : "bg-white/90 text-gray-900 placeholder:text-gray-600 focus:ring-blue-500/30"
                } focus:outline-none focus:ring-2`}
              />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
            </div>
            <div className="relative rounded-lg overflow-hidden h-[40px] group">
              {/* Animated border for Chaos button to match input field */}
              <div className="absolute inset-0 rounded-lg overflow-hidden">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-[spin_4s_linear_infinite] opacity-80"></div>
                <div className="absolute inset-[2px] rounded-md bg-gray-900"></div>
              </div>
              <button
                type="button"
                onClick={() => setChaosMode(!chaosMode)}
                className={`relative z-10 h-full w-full px-4 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1.5 ${
                  chaosMode
                    ? "bg-transparent text-white hover:shadow-lg hover:shadow-purple-500/30"
                    : theme === "dark"
                    ? "bg-gray-800/90 text-gray-300 hover:bg-gray-700/90 hover:shadow-lg hover:shadow-gray-700/30"
                    : "bg-gray-200/90 text-gray-700 hover:bg-gray-300/90 hover:shadow-lg hover:shadow-gray-400/30"
                }`}
                title={
                  chaosMode
                    ? "Chaos Mode: Update all renders"
                    : "Normal Mode: Update selected render only"
                }
              >
                <FaBolt
                  className={`w-3.5 h-3.5 ${
                    chaosMode ? "text-yellow-300 animate-pulse" : ""
                  }`}
                />
                <span
                  className={`${chaosMode ? "text-white font-semibold" : ""}`}
                >
                  {chaosMode ? "Chaos" : "Single"}
                </span>
              </button>
            </div>

            {/* Update/Generate button */}
            <div className="relative rounded-lg overflow-hidden h-[40px]">
              <div className="absolute inset-0 p-[1.5px] rounded-lg overflow-hidden">
                <GlowEffect
                  colors={["#4F46E5", "#4338CA", "#3730A3", "#312E81"]}
                  mode="flowHorizontal"
                  blur="soft"
                  duration={3}
                />
              </div>
              <button
                type="submit"
                className={`relative z-10 h-full w-full px-4 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white transition-all duration-300 ${
                  theme === "dark"
                    ? "bg-indigo-600/90 hover:bg-indigo-700/90 text-white hover:shadow-lg hover:shadow-indigo-500/30"
                    : "bg-indigo-500/90 hover:bg-indigo-600/90 text-white hover:shadow-lg hover:shadow-indigo-500/30"
                }`}
              >
                {isUpdateMode ? "Update" : "Generate"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}
