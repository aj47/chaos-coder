"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FaMicrophone, FaBolt } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import { SignupModal } from "@/components/SignupModal";
import Image from "next/image";

interface PromptInputProps {
  isOpen: boolean;
  onSubmit: (prompt: string, isUpdate?: boolean, chaosMode?: boolean) => Promise<Record<string, unknown> | void> | void;
  isUpdateMode?: boolean;
  model?: string;
  numGenerations?: number;
}

export default function PromptInput({
  onSubmit,
  isUpdateMode = false,
  model = "fast",
  numGenerations = 1,
}: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [chaosMode, setChaosMode] = useState(true);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const { theme } = useTheme();

  // Calculate cost based on model and number of generations
  const calculateCost = () => {
    return numGenerations * (model === "pro" ? 5 : 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      try {
        const result = await onSubmit(prompt, isUpdateMode, chaosMode);
        setPrompt("");
        
        // If onSubmit returns a value with an error property
        if (result && typeof result === 'object' && 'error' in result) {
          if (result.error === 'rate_limit_exceeded') {
            setShowSignupModal(true);
            return;
          }
        }
      } catch (error: unknown) {
        console.error("Error submitting prompt:", error);
        
        // Check for rate limit error in the caught exception
        const err = error as { error?: string, response?: { status: number }, message?: string };
        if (err?.error === 'rate_limit_exceeded' || 
            (err.response && err.response.status === 429) ||
            (err.message && err.message.includes('rate limit'))) {
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
      <div className="relative">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <div
              className={`absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer z-50 ${
                theme === "dark" ? "text-gray-500" : "text-gray-400"
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
              className={`w-full backdrop-blur-xl border-2 rounded-lg pl-10 pr-4 py-2.5 text-sm shadow-xl transition-all ${
                theme === "dark"
                  ? "bg-gray-900/40 border-gray-700/50 text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-blue-500/20"
                  : "bg-white/80 border-gray-200/50 text-gray-900 placeholder-gray-400 focus:border-blue-500/30 focus:ring-blue-500/20"
              } focus:outline-none focus:ring-2`}
            />
            <div
              className={`absolute inset-0 rounded-lg ${
                theme === "dark"
                  ? "bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10"
                  : ""
              } pointer-events-none`}
            />
          </div>
          <button
            type="button"
            onClick={() => setChaosMode(!chaosMode)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              chaosMode
                ? theme === "dark"
                  ? "bg-purple-700 text-white"
                  : "bg-purple-500 text-white"
                : theme === "dark"
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            title={chaosMode ? "Chaos Mode: Update all renders" : "Normal Mode: Update selected render only"}
          >
            <FaBolt className={`w-3 h-3 ${chaosMode ? "text-yellow-300" : ""}`} />
            {chaosMode ? "Chaos" : "Single"}
          </button>
          <button
            type="submit"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
              theme === "dark"
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-indigo-500 hover:bg-indigo-600 text-white"
            }`}
          >
            <span>{isUpdateMode ? "Update" : "Generate"}</span>
            <span className="ml-2 flex items-center">
              <Image src="/coin.png" alt="Credits" width={16} height={16} className="mr-1" />
              {calculateCost()}
            </span>
          </button>
        </form>
      </div>
    </motion.div>
    </>
  );
}
