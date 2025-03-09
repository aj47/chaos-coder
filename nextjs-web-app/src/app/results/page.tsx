"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { AuroraBackground } from "@/components/ui/aurora-background";
import CodePreviewPanel from "@/components/CodePreviewPanel";
import { BrowserContainer } from "@/components/ui/browser-container";
import { useTheme } from "@/context/ThemeContext";
import PromptInput from "@/components/DevTools/PromptInput";
import PerformanceMetrics from "@/components/DevTools/PerformanceMetrics";
import VoiceInput from "@/components/DevTools/VoiceInput";
import MockDeployButton from "@/components/MockDeployButton";
import { SignupModal } from "@/components/SignupModal";
import styled from "styled-components";
import { useTokenStore } from "@/store/useTokenStore";
import { AlertModal } from "@/components/AlertModal";
import { toast } from "react-hot-toast";

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  width: 100%;
  gap: 20px;
  color: #9ca3af;
`;

const LoadingTitle = styled.div`
  font-size: 24px;
  margin-bottom: 10px;
`;

const LoadingBar = styled(motion.div)`
  width: 100%;
  max-width: 500px;
  height: 8px;
  background: rgba(75, 85, 99, 0.3);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
`;

const LoadingProgress = styled(motion.div)`
  height: 100%;
  background: #4b5563;
  border-radius: 4px;
`;

const ShortLoadingBar = styled(LoadingBar)`
  max-width: 300px;
`;

// Wrapper component that uses searchParams
function ResultsContent() {
  const searchParams = useSearchParams();
  const promptParam = searchParams.get('prompt') || '';
  
  // Parse the configuration
  const configParam = searchParams.get('config') || '';
  const defaultConfig = {
    numGenerations: 3,
    model: "fast",
    vibes: ["tailwind", "bootstrap", "materialize"]
  };
  
  let config;
  try {
    config = configParam ? JSON.parse(decodeURIComponent(configParam)) : defaultConfig;
  } catch (e) {
    console.error("Failed to parse config:", e);
    config = defaultConfig;
  }
  
  const { numGenerations, model, vibes } = config;
  
  const [loadingStates, setLoadingStates] = useState<boolean[]>(
    new Array(numGenerations).fill(true)
  );
  const [results, setResults] = useState<string[]>(new Array(numGenerations).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [selectedAppIndex, setSelectedAppIndex] = useState(0);
  const [editedResults, setEditedResults] = useState<string[]>(
    new Array(numGenerations).fill("")
  );
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const [generationTimes, setGenerationTimes] = useState<{
    [key: number]: number;
  }>({});
  const [isVoiceEnabled] = useState(true);
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
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [totalGenerationCost, setTotalGenerationCost] = useState(0);
  const { theme } = useTheme();
  const setTokens = useTokenStore((state) => state.setTokens);

  const variations = [
    "",
    "Make it visually appealing and use a different framework than the other versions.",
    "Focus on simplicity and performance. Use minimal dependencies.",
    "Add some creative features that might not be explicitly mentioned in the prompt.",
    "Create an enhanced version with additional features and modern design patterns.",
    "Build a version with accessibility and internationalization features in mind.",
    "Create a version optimized for mobile devices with responsive design.",
    "Build a version with advanced animations and interactive elements.",
    "Create a version with data visualization capabilities.",
    "Build a version with offline functionality and progressive web app features.",
  ];

  const appTitles = [
    "Standard Version",
    "Visual Focus",
    "Minimalist Version",
    "Creative Approach",
    "Enhanced Version",
    "Accessible Version",
    "Mobile Optimized",
    "Interactive Version",
    "Data Visualization",
    "Progressive Web App",
  ].slice(0, numGenerations);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "l":
            e.preventDefault();
            setIsPromptOpen((prev) => !prev);
            break;
          case "p":
          case "x":
            e.preventDefault();
            setIsMetricsOpen((prev) => !prev);
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const generateApp = async (index: number, promptText: string) => {
    const startTime = performance.now();
    try {
      // Use the vibe from config instead of predefined frameworks
      const vibe = vibes[index] || "tailwind"; // Default to tailwind if not specified
      
      // Determine if this is a custom vibe (not in frameworkPrompts)
      const isCustomVibe = !["tailwind", "materialize", "bootstrap", "patternfly", "pure"].includes(vibe);
      
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          variation: variations[index] || "",
          framework: isCustomVibe ? "custom" : vibe,
          customVibe: isCustomVibe ? vibe : undefined,
          model: model, // Pass the selected model
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        // Authentication required error
        setAlertInfo({
          title: "Authentication Required",
          message: "You need to sign in to generate web apps. Sign in to continue.",
          type: 'auth'
        });
        setShowAlertModal(true);
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
        return;
      }

      if (response.status === 429) {
        // Show signup modal for rate limit
        setShowSignupModal(true);
        throw new Error("Rate limit exceeded. Please create an account to continue.");
      }

      if (data.error === "rate_limit_exceeded") {
        setShowSignupModal(true);
        throw new Error("Rate limit exceeded. Please create an account to continue.");
      } else if (data.error === "insufficient_credits") {
        throw new Error("You have no credits remaining. Please purchase more credits to continue.");
      } else if (data.error) {
        throw new Error(data.error);
      }

      // Check if credits were returned (user is authenticated)
      if (data.credits !== undefined) {
        setRemainingCredits(data.credits);
        setTokens(data.credits); // Update token store with credits from API response
        
        // Update total generation cost if available
        if (data.cost) {
          setTotalGenerationCost(prev => prev + data.cost);
        }
      }

      setResults((prev) => {
        const newResults = [...prev];
        newResults[index] = data.code;
        return newResults;
      });

      setEditedResults((prev) => {
        const newResults = [...prev];
        newResults[index] = data.code;
        return newResults;
      });

      const endTime = performance.now();
      setGenerationTimes((prev) => ({
        ...prev,
        [index]: (endTime - startTime) / 1000, // Convert to seconds
      }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate applications"
      );
    } finally {
      setLoadingStates((prev) => {
        const newStates = [...prev];
        newStates[index] = false;
        return newStates;
      });
    }
  };

  const handleNewPrompt = async (prompt: string, isUpdate: boolean = false, chaosMode: boolean = false) => {
    if (isUpdate) {
      if (chaosMode) {
        // Update all apps in chaos mode
        setLoadingStates(new Array(6).fill(true));
        
        try {
          // Create an array of promises for all apps
          const updatePromises = appTitles.map(async (title, index) => {
            const framework =
              title === "Standard Version"
                ? "bootstrap"
                : title === "Visual Focus"
                ? "materialize"
                : title === "Minimalist Version"
                ? "pure"
                : title === "Creative Approach"
                ? "tailwind"
                : title === "Accessible Version"
                ? "foundation"
                : "Bulma";

            const response = await fetch("/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt,
                existingCode: editedResults[index],
                framework,
                isUpdate: true,
              }),
            });
            
            if (response.status === 401) {
              // Authentication required error
              throw { status: 401, message: "Authentication required" };
            }
            
            if (response.status === 402) {
              // Insufficient credits error
              throw { status: 402, message: "Insufficient credits" };
            }

            if (!response.ok) {
              throw new Error(`Failed to update app ${index + 1}`);
            }

            const data = await response.json();
            if (data.error) {
              throw new Error(data.error);
            }

            return { index, code: data.code };
          });

          // Wait for all updates to complete
          const results = await Promise.all(updatePromises);
          
          // Update all results at once
          setEditedResults((prev) => {
            const newResults = [...prev];
            results.forEach(result => {
              newResults[result.index] = result.code;
            });
            return newResults;
          });
        } catch (error: unknown) {
          setLoadingStates(new Array(6).fill(false));
          
          // Check if the error is our custom error object with status
          if (typeof error === 'object' && error !== null && 'status' in error) {
            const customError = error as { status: number; message: string };
            
            if (customError.status === 401) {
              setAlertInfo({
                title: "Authentication Required",
                message: "You need to sign in to generate web apps. Sign in to continue.",
                type: 'auth'
              });
              setShowAlertModal(true);
            } else if (customError.status === 402) {
              setAlertInfo({
                title: "No Credits Remaining",
                message: "You have used all your available credits. Subscribe to a plan to get more credits.",
                type: 'credits'
              });
              setShowAlertModal(true);
            }
          } else {
            // Handle other errors
            console.error("Error updating apps:", error);
            toast.error("An error occurred while updating the apps.");
          }
        }
      } else {
        // Update only the selected app (original behavior)
        setLoadingStates((prev) => {
          const newStates = [...prev];
          newStates[selectedAppIndex] = true;
          return newStates;
        });

        try {
          const framework =
            appTitles[selectedAppIndex] === "Standard Version"
              ? "bootstrap"
              : appTitles[selectedAppIndex] === "Visual Focus"
              ? "materialize"
              : appTitles[selectedAppIndex] === "Minimalist Version"
              ? "pure"
              : appTitles[selectedAppIndex] === "Creative Approach"
              ? "tailwind"
              : appTitles[selectedAppIndex] === "Accessible Version"
              ? "foundation"
              : "Bulma";

          const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              existingCode: editedResults[selectedAppIndex],
              framework,
              isUpdate: true,
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
            return;
          }

          if (!response.ok) {
            throw new Error(`Failed to update app ${selectedAppIndex + 1}`);
          }

          const data = await response.json();
          if (data.error) {
            throw new Error(data.error);
          }

          setEditedResults((prev) => {
            const newResults = [...prev];
            newResults[selectedAppIndex] = data.code;
            return newResults;
          });
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to update application"
          );
        } finally {
          setLoadingStates((prev) => {
            const newStates = [...prev];
            newStates[selectedAppIndex] = false;
            return newStates;
          });
        }
      }
    } else {
      setLoadingStates(new Array(numGenerations).fill(true));
      setResults(new Array(numGenerations).fill(""));
      setEditedResults(new Array(numGenerations).fill(""));
      setGenerationTimes({});
      Promise.all(variations.map((_, index) => generateApp(index, prompt)));
    }
  };

  const handleVoiceInput = (text: string) => {
    handleNewPrompt(text, true, false); // Default to single mode for voice input
  };

  useEffect(() => {
    if (!promptParam) {
      setError("No prompt provided");
      setLoadingStates(new Array(numGenerations).fill(false));
      return;
    }

    Promise.all(
      Array.from({ length: numGenerations }).map((_, index) => 
        generateApp(index, promptParam)
      )
    );
  }, [promptParam, numGenerations]);

  const handleCodeChange = (newCode: string) => {
    const newResults = [...editedResults];
    newResults[selectedAppIndex] = newCode;
    setEditedResults(newResults);
  };

  // Function to handle clicking on a tile
  const handleTileClick = (index: number) => {
    setSelectedAppIndex(index);
    // Scroll to the detailed view
    setTimeout(() => {
      document.getElementById('detailed-view')?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  return (
    <AuroraBackground>
      <AlertModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={alertInfo.title}
        message={alertInfo.message}
        type={alertInfo.type}
      />
      {showSignupModal && (
        <SignupModal
          isOpen={showSignupModal}
          onClose={() => setShowSignupModal(false)}
        />
      )}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`w-full h-screen p-6 pb-20 md:p-8 ${
          theme === "dark" ? "bg-gray-900" : ""
        }`}
      >
        <div
          className={`max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col ${
            theme === "light" ? "backdrop-blur-sm" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-8">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-xl ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              <Link href="/">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300 cursor-pointer hover:opacity-80 transition-opacity">
                  Chaos Coder
                </span>
              </Link>
            </motion.h1>
            <div className="flex items-center gap-4">
              {/* Display total cost */}
              {totalGenerationCost > 0 && (
                <div className={`py-2 px-4 rounded-lg text-sm font-medium flex items-center ${
                  theme === "dark"
                    ? "bg-gray-800 text-gray-300"
                    : "bg-gray-200 text-gray-700"
                }`}>
                  <Image src="/coin.png" alt="Credits" width={16} height={16} className="mr-1" />
                  <span>{totalGenerationCost} tokens spent</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div
              className={`p-4 rounded-lg ${
                theme === "dark" ? "bg-red-900/20" : "bg-red-50"
              }`}
            >
              <p
                className={`text-center ${
                  theme === "dark" ? "text-red-400" : "text-red-600"
                }`}
              >
                {error}
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="h-[calc(100vh-10rem)] overflow-y-auto">
              {/* Grid of all app previews */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {appTitles.map((title, index) => (
                  <motion.div
                    key={title}
                    className={`rounded-lg overflow-hidden border ${
                      selectedAppIndex === index 
                        ? theme === "dark" 
                          ? "border-indigo-500/50 ring-2 ring-indigo-500/30" 
                          : "border-indigo-500 ring-2 ring-indigo-300/50"
                        : theme === "dark"
                          ? "border-gray-700"
                          : "border-gray-200"
                    } transition-all duration-200 cursor-pointer`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleTileClick(index)}
                  >
                    <div className="h-[300px]">
                      <BrowserContainer theme={theme} title={title}>
                        {loadingStates[index] ? (
                          <LoadingContainer>
                            <LoadingTitle>Generating</LoadingTitle>
                            <LoadingBar>
                              <LoadingProgress
                                animate={{
                                  x: ["-100%", "100%"],
                                }}
                                transition={{
                                  repeat: Infinity,
                                  duration: 1.5,
                                  ease: "linear",
                                }}
                              />
                            </LoadingBar>
                            <ShortLoadingBar>
                              <LoadingProgress
                                animate={{
                                  x: ["-100%", "100%"],
                                }}
                                transition={{
                                  repeat: Infinity,
                                  duration: 2,
                                  ease: "linear",
                                  delay: 0.2,
                                }}
                              />
                            </ShortLoadingBar>
                          </LoadingContainer>
                        ) : (
                          <CodePreviewPanel
                            code={editedResults[index] || ""}
                            onChange={(newCode) => {
                              const newResults = [...editedResults];
                              newResults[index] = newCode;
                              setEditedResults(newResults);
                            }}
                            isLoading={loadingStates[index]}
                            theme={theme}
                            showControls={false}
                          />
                        )}
                      </BrowserContainer>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Expanded view of selected app */}
              <motion.div
                id="detailed-view"
                className="mt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <h2 className={`text-xl font-semibold mb-4 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}>
                  {appTitles[selectedAppIndex]} - Detailed View
                </h2>
                <div className="h-[500px]">
                  <BrowserContainer theme={theme} title={`${appTitles[selectedAppIndex]} - Detailed View`}>
                    {loadingStates[selectedAppIndex] ? (
                      <LoadingContainer>
                        <LoadingTitle>Generating</LoadingTitle>
                        <LoadingBar>
                          <LoadingProgress
                            animate={{
                              x: ["-100%", "100%"],
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 1.5,
                              ease: "linear",
                            }}
                          />
                        </LoadingBar>
                        <ShortLoadingBar>
                          <LoadingProgress
                            animate={{
                              x: ["-100%", "100%"],
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 2,
                              ease: "linear",
                              delay: 0.2,
                            }}
                          />
                        </ShortLoadingBar>
                      </LoadingContainer>
                    ) : (
                      <div className="relative h-full">
                        <CodePreviewPanel
                          code={editedResults[selectedAppIndex] || ""}
                          onChange={handleCodeChange}
                          isLoading={loadingStates[selectedAppIndex]}
                          theme={theme}
                          deployButton={
                            <MockDeployButton 
                              code={editedResults[selectedAppIndex] || ""} 
                              theme={theme} 
                            />
                          }
                        />
                      </div>
                    )}
                  </BrowserContainer>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>
      {/* Tools at bottom */}
      {isVoiceEnabled && (
        <VoiceInput onInput={(text) => handleVoiceInput(text)} theme={theme} />
      )}
      
      <PromptInput
        isOpen={isPromptOpen}
        onSubmit={handleNewPrompt}
        isUpdateMode={true}
        model={model}
        numGenerations={numGenerations}
      />
      
      <PerformanceMetrics
        isOpen={isMetricsOpen}
        onClose={() => setIsMetricsOpen(false)}
        generationTimes={generationTimes}
      />
      
      {/* Credit Alert */}
      {remainingCredits !== null && remainingCredits < 10 && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          theme === "dark" ? "bg-yellow-900/80 text-yellow-100" : "bg-yellow-100 text-yellow-800"
        }`}>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium">Low Credits Alert</p>
              <p className="text-sm">You have {remainingCredits} credits remaining. Visit settings to purchase more.</p>
            </div>
            <button 
              onClick={() => setShowAlertModal(true)}
              className="ml-auto text-sm hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </AuroraBackground>
  );
}

// Main component with Suspense boundary
export default function Results() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Loading...</h2>
          <div className="w-16 h-16 border-4 border-gray-300 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
