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
  FaCalendarAlt,
  FaStore,
  FaRobot,
  FaQuestionCircle,
  FaMinus,
  FaPlus,
} from "react-icons/fa";

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

// Constants for number of generations
const MIN_NUM_GENERATIONS = 1;
const MAX_NUM_GENERATIONS = 6;

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [numGenerations, setNumGenerations] = useState(3);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const router = useRouter();
  const examples = [
    {
      prompt:
        "A Pokédex web app that displays Pokémon information with search and filter functionality",
      icon: <FaTasks className="w-4 h-4" />,
      label: "Pokédex",
    },
    {
      prompt:
        "A Father's Day card web app with customizable messages and designs",
      icon: <FaBlog className="w-4 h-4" />,
      label: "Father's Day Card",
    },
    {
      prompt:
        "A Happy Birthday gift web app for [Insert name here] with personalized wishes and interactive elements",
      icon: <FaUserTie className="w-4 h-4" />,
      label: "Happy Birthday Gift",
    },
    {
      prompt:
        "A classic Tetris game web app with falling blocks, line clearing, and scoring",
      icon: <FaRobot className="w-4 h-4" />,
      label: "Tetris Game",
    },
    {
      prompt:
        "A Snake game web app with arrow key controls, food collection, and high score tracking",
      icon: <FaStore className="w-4 h-4" />,
      label: "Snake Game",
    },
    {
      prompt:
        "A classic Pong game web app with paddle controls, ball physics, and two-player mode",
      icon: <FaQuestionCircle className="w-4 h-4" />,
      label: "Pong Game",
    },
  ];
  const [isLoading, setIsLoading] = useState(false);

  // Functions for incrementing/decrementing generations
  const incrementGenerations = () => {
    if (numGenerations < MAX_NUM_GENERATIONS) {
      setNumGenerations(numGenerations + 1);
    }
  };

  const decrementGenerations = () => {
    if (numGenerations > MIN_NUM_GENERATIONS) {
      setNumGenerations(numGenerations - 1);
    }
  };

  // Gradient style for the number display
  const gradientStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };

  const handleSubmit = async () => {
    if (!prompt) {
      setError("Please enter a prompt to generate web applications.");
      return;
    }

    setError(null);
    setIsLoading(true);
    
    try {
      // Navigate directly to results page
      router.push(`/results?prompt=${encodeURIComponent(prompt)}&numGenerations=${numGenerations}`);
    } catch (error) {
      console.error("Error navigating to results:", error);
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
        <HeroGeometric
          badge=""
          title1="Chaos Coder"
          title2={`${numGenerations}x Dev`}
        >
          <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 mb-10">
            <div className="relative bg-[#1a1f2e]/80 backdrop-blur-xl rounded-2xl overflow-hidden border border-[#2a3040] shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]">
              <div className="relative p-4 sm:p-6 z-10">
                {/* Prompt and Number of Websites Container */}
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  {/* Prompt Text Area */}
                  <div className="w-full md:flex-grow">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="E.g., A to-do list app with local storage and dark mode"
                      className="w-full h-24 sm:h-32 p-3 sm:p-4 bg-[#1a1f2e]/50 font-sans text-sm sm:text-base
                             border border-[#2a3040] rounded-xl
                             focus:ring-2 focus:ring-[#3b82f6]/50 focus:border-transparent resize-none
                             placeholder:text-gray-400/70
                             text-gray-200"
                    />
                  </div>

                  {/* Number of Websites Control */}
                  <div className="w-full md:w-48 p-3 bg-[#1a1f2e]/30 border border-[#2a3040] rounded-lg self-start h-24 sm:h-32 flex flex-col justify-around">
                    <div className="text-xs sm:text-sm bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300 font-medium mb-2">
                      Number of Websites:
                    </div>
                    <div className="flex items-center justify-center">
                      <motion.button
                        onClick={decrementGenerations}
                        disabled={numGenerations <= MIN_NUM_GENERATIONS}
                        className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-[#1a1f2e]/90 to-[#141822]/90 border border-[#2a3040] ${numGenerations <= MIN_NUM_GENERATIONS ? 'opacity-50 cursor-not-allowed text-gray-600' : 'text-gray-400 hover:text-gray-200'} shadow-md`}
                        whileHover={numGenerations > MIN_NUM_GENERATIONS ? { scale: 1.05 } : undefined}
                        whileTap={numGenerations > MIN_NUM_GENERATIONS ? { scale: 0.95 } : undefined}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <FaMinus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </motion.button>
                      <div className="mx-3 sm:mx-4 flex flex-col items-center">
                        <motion.div
                          className="text-2xl sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-rose-300 font-bold"
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
                        className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-[#1a1f2e]/90 to-[#141822]/90 border border-[#2a3040] ${numGenerations >= MAX_NUM_GENERATIONS ? 'opacity-50 cursor-not-allowed text-gray-600' : 'text-gray-400 hover:text-gray-200'} shadow-md`}
                        whileHover={numGenerations < MAX_NUM_GENERATIONS ? { scale: 1.05 } : undefined}
                        whileTap={numGenerations < MAX_NUM_GENERATIONS ? { scale: 0.95 } : undefined}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <FaPlus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </motion.button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
                  {examples.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(example.prompt)}
                      className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg
                             bg-[#1a1f2e]/50 border border-[#2a3040] text-xs sm:text-sm text-gray-300
                             hover:border-[#3b82f6]/50 transition-colors"
                    >
                      {example.icon}
                      <span className="hidden sm:inline">{example.label}</span>
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 text-red-500 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Generate Button - Moved above style settings */}
                <RainbowButton
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 text-lg font-medium"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                  ) : null}
                  Generate Web Apps {!isLoading && <>+</>}
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
