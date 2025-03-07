"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { useTheme } from "@/context/ThemeContext";
import {
  FaTasks,
  FaBlog,
  FaUserTie,
  FaStore,
  FaRobot,
  FaQuestionCircle,
} from "react-icons/fa";

// Signup Modal Component
export function SignupModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  
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
        <p className="mb-6">You&apos;ve reached the limit of 25 free generations. Create an account to continue using our service.</p>
        
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
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const examples = [
    {
      prompt:
        "A Python script for creating a simple to-do list application with file storage",
      icon: <FaTasks className="w-4 h-4" />,
      label: "To-Do List Script",
    },
    {
      prompt:
        "A Python script for data analysis that reads CSV files and generates statistics",
      icon: <FaBlog className="w-4 h-4" />,
      label: "Data Analysis Script",
    },
    {
      prompt:
        "A Python script for web scraping that extracts information from a website",
      icon: <FaUserTie className="w-4 h-4" />,
      label: "Web Scraping Script",
    },
    {
      prompt:
        "A Python script for automating file organization in a directory",
      icon: <FaRobot className="w-4 h-4" />,
      label: "File Automation Script",
    },
    {
      prompt:
        "A Python script for creating a simple CLI tool that converts between different units",
      icon: <FaStore className="w-4 h-4" />,
      label: "Unit Converter Script",
    },
    {
      prompt:
        "A Python script for creating a simple chatbot that can answer basic questions",
      icon: <FaRobot className="w-4 h-4" />,
      label: "Simple Chatbot Script",
    },
    {
      prompt:
        "A Python script for creating a simple quiz or trivia game with scoring",
      icon: <FaQuestionCircle className="w-4 h-4" />,
      label: "Quiz Game Script",
    },
  ];
  const [isLoading, setIsLoading] = useState(false);

  const [showSignupModal, setShowSignupModal] = useState(false);

  const handleSubmit = async () => {
    if (!prompt) {
      setError("Please enter a prompt to generate Python scripts.");
      return;
    }

    setError(null);
    setIsLoading(true);
    
    try {
      // Make a test request to check rate limit before redirecting
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.substring(0, 50), // Just send a small part of the prompt for the check
          variation: "rate-limit-check",
          scriptType: "basic",
        }),
      });
      
      if (response.status === 429) {
        // Rate limit exceeded
        setShowSignupModal(true);
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      if (data.error === "rate_limit_exceeded") {
        setShowSignupModal(true);
        setIsLoading(false);
        return;
      }
      
      // If no rate limit issues, proceed to results page
      router.push(`/results?prompt=${encodeURIComponent(prompt)}`);
    } catch (error) {
      console.error("Error checking rate limit:", error);
      // Still try to navigate even if there was an error checking rate limit
      router.push(`/results?prompt=${encodeURIComponent(prompt)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full">
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
                  placeholder="E.g., A Python script that organizes files by extension and creation date"
                  className="w-full h-32 p-4 bg-[#1a1f2e]/50 font-sans text-base
                         border border-[#2a3040] rounded-xl mb-4 
                         text-white placeholder-gray-400 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20
                         focus:outline-none transition-all"
                />
                
                {/* Display error message if there is one */}
                {error && (
                  <div className="text-red-500 mb-4 text-sm">{error}</div>
                )}
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {examples.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(example.prompt)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                             bg-[#1a1f2e]/50 border border-[#2a3040] text-sm text-gray-300
                             hover:border-[#3b82f6]/50 transition-colors"
                    >
                      {example.icon}
                      {example.label}
                    </button>
                  ))}
                </div>

                <RainbowButton
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 text-lg font-medium"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                  ) : null}
                  Generate Python Scripts {!isLoading && <>+</>}
                </RainbowButton>
                
                <div className="mt-4 text-center text-sm text-gray-400">
                  <p>This is an early preview. Open source at{" "}
                    <a 
                      href="https://github.com/aj47/chaos-coder" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      github.com/aj47/chaos-coder
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
