"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { SignupModal } from "@/components/SignupModal";
import {
  FaTasks,
  FaBlog,
  FaUserTie,
  FaStore,
  FaRobot,
  FaQuestionCircle,
} from "react-icons/fa";
import { AlertModal } from "@/components/AlertModal";
import { toast } from "react-hot-toast";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const examples = [
    {
      prompt:
        "A web app for creating a simple to-do list without user authentication",
      icon: <FaTasks className="w-4 h-4" />,
      label: "Simple To-Do List",
    },
    {
      prompt:
        "A web app for creating a simple blog with a list of posts, without user authentication",
      icon: <FaBlog className="w-4 h-4" />,
      label: "Simple Blog",
    },
    {
      prompt:
        "A web app for creating a simple portfolio with a list of projects, without user authentication",
      icon: <FaUserTie className="w-4 h-4" />,
      label: "Simple Portfolio",
    },
    {
      prompt:
        "A web app for displaying a hardware diagram from a given .asc file, context:",
      icon: <FaRobot className="w-4 h-4" />,
      label: "Hardware Diagram",
    },
    {
      prompt:
        "A web app for generating a simple website for a small business, with a homepage, about page, and contact page, without user authentication",
      icon: <FaStore className="w-4 h-4" />,
      label: "Simple Website for Small Business",
    },
    {
      prompt:
        "A web app for creating a simple chatbot that can answer basic questions about a company's products and services, without user authentication",
      icon: <FaRobot className="w-4 h-4" />,
      label: "Simple Chatbot",
    },
    {
      prompt:
        "A web app for creating a simple quiz or trivia game with multiple choice questions and scoring, without user authentication",
      icon: <FaQuestionCircle className="w-4 h-4" />,
      label: "Simple Quiz or Trivia Game",
    },
  ];
  const [isLoading, setIsLoading] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{
    title: string;
    message: string;
    type: 'auth' | 'credits';
  }>({
    title: '',
    message: '',
    type: 'auth'
  });

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
          message: "You need to sign in to generate web apps. Sign in to continue.",
          type: 'auth'
        });
        setShowAlertModal(true);
        setIsLoading(false);
        return;
      }
      
      if (response.status === 402) {
        // Insufficient credits error
        setAlertInfo({
          title: "No Credits Remaining",
          message: "You have used all your available credits. Subscribe to a plan to get more credits.",
          type: 'credits'
        });
        setShowAlertModal(true);
        setIsLoading(false);
        return;
      }
      
      if (response.status === 429) {
        setShowSignupModal(true);
        setIsLoading(false);
        return;
      }
      
      // If we get here, the user is authenticated and has credits
      // Proceed with the redirect
      const encodedPrompt = encodeURIComponent(prompt);
      router.push(`/results?prompt=${encodedPrompt}`);
      
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
