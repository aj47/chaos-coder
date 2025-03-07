"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Handle redirect parameter if present
  useEffect(() => {
    const redirect = searchParams.get('redirect');
    
    // Check if user is authenticated before redirecting to protected routes
    const checkAuthAndRedirect = async () => {
      if (redirect) {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log("[DEBUG] Redirect check - Session:", session ? `User: ${session.user.id}` : "No session");
        
        // Only redirect if user is authenticated
        if (session) {
          router.push(redirect);
        }
      }
    };
    
    checkAuthAndRedirect();
  }, [searchParams, router]);
  
  // Debug function to check authentication state
  const checkAuthState = async () => {
    try {
      console.log("[DEBUG] Manually checking auth state");
      const supabase = createClient();
      
      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      
      // Get all cookies
      const cookies = document.cookie;
      
      // Create debug info
      let info = "=== AUTH DEBUG INFO ===\n";
      info += `Session exists: ${!!session}\n`;
      if (session) {
        info += `User ID: ${session.user.id}\n`;
        info += `Session expires: ${new Date(session.expires_at! * 1000).toISOString()}\n`;
        info += `Access token (first 10 chars): ${session.access_token.substring(0, 10)}...\n`;
        info += `Refresh token exists: ${!!session.refresh_token}\n`;
      }
      info += `\nCookies: ${cookies}\n`;
      
      console.log(info);
      setDebugInfo(info);
    } catch (error) {
      console.error("[DEBUG] Error checking auth state:", error);
      setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
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

  const handleSubmit = async () => {
    if (!prompt) {
      setErrorMessage("Please enter a prompt to generate web applications.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    
    try {
      // Make a test request to check rate limit before redirecting
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.substring(0, 50), // Just send a small part of the prompt for the check
          variation: "rate-limit-check",
          framework: "none",
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
      {/* Debug button */}
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={checkAuthState}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm"
        >
          Debug Auth
        </button>
        {debugInfo && (
          <pre className="mt-2 p-4 bg-black/80 text-green-400 rounded-lg text-xs max-w-lg max-h-96 overflow-auto">
            {debugInfo}
          </pre>
        )}
      </div>
      
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
