"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AuroraBackground } from "@/components/ui/aurora-background";
import CodePreviewPanel from "@/components/CodePreviewPanel";
import { useTheme } from "@/context/ThemeContext";
import PromptInput from "@/components/DevTools/PromptInput";
import PerformanceMetrics from "@/components/DevTools/PerformanceMetrics";
import VoiceInput from "@/components/DevTools/VoiceInput";
import { SignupModal } from "@/components/SignupModal";
import styled from "styled-components";
import { useTokenStore } from "@/store/useTokenStore";
import { AlertModal } from "@/components/AlertModal";
import { 
  DEFAULT_STYLES, 
  isPredefinedStyle, 
  getStyleDisplayNames
} from "@/config/styles";
import AppTile from "@/components/AppTile";

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
    numGenerations: 9,
    modelTypes: Array(9).fill(0).map((_, index) => index % 2 === 0 ? "pro" : "fast"),
    styles: DEFAULT_STYLES.slice(0, 9)
  };
  
  let config;
  try {
    config = configParam ? JSON.parse(decodeURIComponent(configParam)) : defaultConfig;
  } catch (e) {
    console.error("Failed to parse config:", e);
    config = defaultConfig;
  }
  
  // If we still have old config with vibes, convert it to styles
  const styles = config.styles || config.vibes || defaultConfig.styles;
  const { numGenerations, modelTypes = defaultConfig.modelTypes } = config;
  
  const [loadingStates, setLoadingStates] = useState<boolean[]>(
    new Array(numGenerations).fill(true)
  );
  const [results, setResults] = useState<string[]>(new Array(numGenerations).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [selectedAppIndex, setSelectedAppIndex] = useState<number>(0);
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
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const { theme } = useTheme();
  const setTokens = useTokenStore((state) => state.setTokens);

  // Reference for animation
  const containerRef = useRef<HTMLDivElement>(null);

  const variations = [
    "Build a version with offline functionality and progressive web app features.",
  ];

  // Create a mapping from style values to display names using our central configuration
  const styleDisplayNames = getStyleDisplayNames();

  // Generate app titles based on the styles from the config
  const appTitles = styles.map((style: string) => styleDisplayNames[style] || style);

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
      // Use the style from config instead of predefined frameworks
      const style = styles[index] || DEFAULT_STYLES[index % DEFAULT_STYLES.length] || DEFAULT_STYLES[0]; // Use corresponding default style or first as fallback
      
      // Determine if this is a custom style using our central helper
      const isCustomStyle = !isPredefinedStyle(style);
      
      // Get the model type for this specific generation
      const modelType = modelTypes[index] || "fast";
      
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          variation: variations[index] || "",
          framework: isCustomStyle ? "custom" : style,
          customStyle: isCustomStyle ? style : undefined,
          model: modelType, // Use the specific model for this generation
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
          const updatePromises = appTitles.map(async (title: string, index: number) => {
            // Use the style directly from the styles array
            const style = styles[index];
            
            // Check if this is a custom style using our central helper
            const isCustomStyle = !isPredefinedStyle(style);
            
            const response = await fetch("/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt,
                existingCode: editedResults[index],
                framework: isCustomStyle ? "custom" : style,
                customStyle: isCustomStyle ? style : undefined,
                isUpdate: true,
                model: modelTypes[index] || "fast",
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
            
            if (response.status === 429) {
              // Rate limit error
              throw { status: 429, message: "Rate limit exceeded" };
            }
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return { index, data };
          });
          
          // Wait for all promises to resolve
          const results = await Promise.all(updatePromises);
          
          // Update the results state with the new data
          results.forEach(({ index, data }) => {
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
          });
        } catch (error: unknown) {
          console.error("Error updating apps:", error);
          
          // Check if error is an object with status property
          if (error && typeof error === 'object' && 'status' in error) {
            const statusError = error as { status: number; message?: string };
            
            if (statusError.status === 401) {
              setAlertInfo({
                title: "Authentication Required",
                message: "You need to sign in to generate web apps. Sign in to continue.",
                type: 'auth'
              });
              setShowAlertModal(true);
            } else if (statusError.status === 402) {
              setAlertInfo({
                title: "No Credits Remaining",
                message: "You have used all your available credits. Subscribe to a plan to get more credits.",
                type: 'credits'
              });
              setShowAlertModal(true);
            } else if (statusError.status === 429) {
              setShowSignupModal(true);
            }
          } else {
            setError("Failed to update apps. Please try again.");
          }
        } finally {
          setLoadingStates(new Array(6).fill(false));
        }
      } else {
        // Update only the selected app
        setLoadingStates((prev) => {
          const newStates = [...prev];
          newStates[selectedAppIndex] = true;
          return newStates;
        });
        
        try {
          // Use the style directly from the styles array
          const style = styles[selectedAppIndex];
          
          // Check if this is a custom style using our central helper
          const isCustomStyle = !isPredefinedStyle(style);
          
          const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              existingCode: editedResults[selectedAppIndex],
              framework: isCustomStyle ? "custom" : style,
              customStyle: isCustomStyle ? style : undefined,
              isUpdate: true,
              model: modelTypes[selectedAppIndex] || "fast",
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
          
          if (response.status === 429) {
            // Show signup modal for rate limit
            setShowSignupModal(true);
            throw new Error("Rate limit exceeded. Please create an account to continue.");
          }
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          
          setResults((prev) => {
            const newResults = [...prev];
            newResults[selectedAppIndex] = data.code;
            return newResults;
          });
          
          setEditedResults((prev) => {
            const newResults = [...prev];
            newResults[selectedAppIndex] = data.code;
            return newResults;
          });
        } catch (error) {
          console.error("Error updating app:", error);
          setError("Failed to update app. Please try again.");
        } finally {
          setLoadingStates((prev) => {
            const newStates = [...prev];
            newStates[selectedAppIndex] = false;
            return newStates;
          });
        }
      }
    } else {
      // Generate a new app
      // For new generation, use the selected style if available
      const styleToUse = selectedStyle || DEFAULT_STYLES[0];
      const isCustomStyle = !isPredefinedStyle(styleToUse);
      
      // Add a new loading state
      setLoadingStates((prev) => [...prev, true]);
      
      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            framework: isCustomStyle ? "custom" : styleToUse,
            customStyle: isCustomStyle ? styleToUse : undefined,
            model: "fast", // Default to fast model for new generations
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
          
          // Remove the loading state we just added
          setLoadingStates((prev) => prev.slice(0, -1));
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
          
          // Remove the loading state we just added
          setLoadingStates((prev) => prev.slice(0, -1));
          return;
        }
        
        if (response.status === 429) {
          // Show signup modal for rate limit
          setShowSignupModal(true);
          
          // Remove the loading state we just added
          setLoadingStates((prev) => prev.slice(0, -1));
          throw new Error("Rate limit exceeded. Please create an account to continue.");
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Add the new result
        setResults((prev) => [...prev, data.code]);
        setEditedResults((prev) => [...prev, data.code]);
        
        // Add the style to the styles array
        styles.push(styleToUse);
        
        // Select the new app
        setSelectedAppIndex(results.length);
        
        // Reset selected style after generation
        setSelectedStyle(null);
        
      } catch (error) {
        console.error("Error generating new app:", error);
        setError("Failed to generate new app. Please try again.");
        
        // Remove the loading state we just added
        setLoadingStates((prev) => prev.slice(0, -1));
      } finally {
        // Update the loading state for the new app
        setLoadingStates((prev) => {
          const newStates = [...prev];
          newStates[newStates.length - 1] = false;
          return newStates;
        });
      }
    }
    
    // Close the prompt input
    setIsPromptOpen(false);
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
    // No need to scroll to detailed view since it's now at the top
  };

  // Handle app deletion
  const handleDeleteApp = (index: number) => {
    // Create new arrays without the deleted item
    const newLoadingStates = [...loadingStates];
    newLoadingStates.splice(index, 1);
    setLoadingStates(newLoadingStates);
    
    const newResults = [...results];
    newResults.splice(index, 1);
    setResults(newResults);
    
    const newEditedResults = [...editedResults];
    newEditedResults.splice(index, 1);
    setEditedResults(newEditedResults);
    
    // Update selected index if needed
    if (selectedAppIndex >= index && selectedAppIndex > 0) {
      setSelectedAppIndex(selectedAppIndex - 1);
    }
    
    // Show confirmation toast
    setAlertInfo({
      title: "App Deleted",
      message: "The app has been successfully deleted.",
      type: 'auth' // Reusing existing alert type
    });
    setShowAlertModal(true);
  };

  // Handle style selection for new generation
  const handleStyleSelect = (style: string) => {
    setSelectedStyle(style);
  };

  // Handle new generation with selected style
  const handleNewGeneration = () => {
    // Open the prompt input with the selected style
    setIsPromptOpen(true);
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
            <div className="h-[calc(100vh-10rem)] overflow-y-auto" ref={containerRef}>
              {/* Expanded view of selected app at the TOP */}
              <motion.div
                layout
                id="detailed-view"
                className="mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="relative bg-gray-50 dark:bg-gray-800 rounded-lg p-3 shadow-xl border border-gray-200 dark:border-gray-700">
                  {/* Mac-style header */}
                  <div className="flex items-center px-3 py-2 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-b border-gray-300 dark:border-gray-600 rounded-t-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="flex-1 text-center">
                      <span className={`text-xs font-medium truncate ${
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }`}>
                        {appTitles[selectedAppIndex]} - Detailed View
                        {/* Add pro model badge to detailed view title */}
                        {modelTypes[selectedAppIndex] === "pro" && (
                          <span className="ml-2 px-2 py-1 bg-purple-600 text-white text-xs rounded-full font-medium">
                            PRO
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="w-12"></div>
                  </div>
                  
                  {/* Main content */}
                  <div className="h-[500px]">
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
                      <CodePreviewPanel
                        code={editedResults[selectedAppIndex] || ""}
                        onChange={(newCode) => handleCodeChange(newCode)}
                        isLoading={loadingStates[selectedAppIndex]}
                        theme={theme}
                        showControls={true}
                      />
                    )}
                  </div>
                  
                  {/* Control buttons */}
                  <div className="pt-4 pb-2 px-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                    <div>
                      <button
                        onClick={() => setIsPromptOpen(true)}
                        className={`px-4 py-2 rounded-md font-medium text-sm mr-2 ${
                          theme === "dark"
                            ? "bg-gray-700 text-white hover:bg-gray-600"
                            : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                        }`}
                      >
                        Edit Prompt
                      </button>
                    </div>
                    <div>
                      <button
                        className={`px-4 py-2 rounded-md font-medium text-sm mr-2 ${
                          theme === "dark"
                            ? "bg-blue-600 text-white hover:bg-blue-500"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                        }`}
                      >
                        Deploy
                      </button>
                      <button
                        className={`px-4 py-2 rounded-md font-medium text-sm ${
                          theme === "dark"
                            ? "bg-green-600 text-white hover:bg-green-500"
                            : "bg-green-500 text-white hover:bg-green-600"
                        }`}
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* Grid of all app previews */}
              <AnimatePresence>
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-xl font-semibold mb-4 ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  All Designs
                </motion.h2>
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {appTitles.map((title: string, index: number) => (
                    <motion.div
                      key={index}
                      layout
                      className={`rounded-lg overflow-hidden ${
                        selectedAppIndex === index 
                          ? theme === "dark" 
                            ? "border-indigo-500/50 ring-2 ring-indigo-500/30" 
                            : "border-indigo-500 ring-2 ring-indigo-300/50"
                          : theme === "dark"
                            ? "border-gray-700"
                            : "border-gray-200"
                      } transition-all duration-300 relative`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        scale: selectedAppIndex === index ? 1.03 : 1
                      }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ 
                        type: "spring",
                        damping: 20,
                        stiffness: 200,
                        delay: index * 0.05
                      }}
                    >
                      {/* Pro model badge */}
                      {modelTypes[index] === "pro" && (
                        <div className="absolute top-2 right-2 z-20 px-2 py-1 bg-purple-600 text-white text-xs rounded-full font-medium shadow-lg">
                          PRO
                        </div>
                      )}
                      
                      {/* Use the AppTile component with Mac-like window style */}
                      <AppTile
                        title={title}
                        isSelected={selectedAppIndex === index}
                        onClick={() => handleTileClick(index)}
                        onDelete={() => handleDeleteApp(index)}
                        isLoading={loadingStates[index]}
                        theme={theme}
                        showPreviewButtons={selectedAppIndex === index}
                      >
                        {!loadingStates[index] && (
                          <CodePreviewPanel
                            code={editedResults[index] || ""}
                            onChange={(newCode) => {
                              const newResults = [...editedResults];
                              newResults[index] = newCode;
                              setEditedResults(newResults);
                            }}
                            isLoading={false}
                            theme={theme}
                            showControls={false}
                          />
                        )}
                      </AppTile>
                    </motion.div>
                  ))}
                  
                  {/* Add the "+" placeholder tile for generating new designs */}
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ 
                      type: "spring",
                      damping: 20,
                      stiffness: 200,
                      delay: appTitles.length * 0.05
                    }}
                  >
                    <AppTile
                      title="Add New Design"
                      isSelected={false}
                      onClick={handleNewGeneration}
                      theme={theme}
                      isPlaceholder={true}
                      availableStyles={Object.values(getStyleDisplayNames())}
                      onStyleSelect={handleStyleSelect}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
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
        model={modelTypes[selectedAppIndex] || "fast"}
        numGenerations={numGenerations}
        initialStyle={selectedStyle}
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
