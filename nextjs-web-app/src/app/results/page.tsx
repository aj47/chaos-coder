"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { useTheme } from "@/context/ThemeContext";
import { useGenerations } from "@/context/GenerationsContext";
import PromptInput from "@/components/DevTools/PromptInput";
import PerformanceMetrics from "@/components/DevTools/PerformanceMetrics";
import VoiceInput from "@/components/DevTools/VoiceInput";
import { SignupModal } from "@/components/SignupModal";
import { AlertModal } from "@/components/AlertModal";
import { useAuth } from "@/context/AuthContext";
import {
  DEFAULT_STYLES,
  isPredefinedStyle,
  getStyleDisplayNames
} from "@/config/styles";
import AppTile from "@/components/AppTile";
import ThemeToggle from "@/components/ThemeToggle";

// Wrapper component that uses searchParams
function ResultsContent() {
  const searchParams = useSearchParams();
  const promptParam = searchParams.get('prompt') || '';
  const { numGenerations: contextNumGenerations } = useGenerations();

  // Parse the configuration
  const configParam = searchParams.get('config') || '';
  const defaultConfig = {
    numGenerations: contextNumGenerations,
    modelTypes: Array(contextNumGenerations).fill(0).map((_, index) => index % 2 === 0 ? "pro" : "fast"),
    styles: DEFAULT_STYLES.slice(0, contextNumGenerations)
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
  const [expandedAppIndex, setExpandedAppIndex] = useState<number | null>(null);
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
  const { setTokens } = useAuth();

  // Track in-flight requests to prevent duplicates
  const pendingRequests = useRef<Set<string>>(new Set());

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

  const getFramework = useCallback((title: string) => {
    switch (title) {
      case "Standard Version": return "bootstrap";
      case "Visual Focus": return "materialize";
      case "Minimalist Version": return "pure";
      case "Creative Approach": return "tailwind";
      case "Accessible Version": return "foundation";
      default: return "Bulma";
    }
  }, []);

  const generateApp = useCallback(async (index: number, promptText: string) => {
    const startTime = performance.now();
    try {
      // Use the style from config instead of predefined frameworks
      const style = styles[index] || DEFAULT_STYLES[index % DEFAULT_STYLES.length] || DEFAULT_STYLES[0]; // Use corresponding default style or first as fallback

      // Determine if this is a custom style using our central helper
      const isCustomStyle = !isPredefinedStyle(style);

      // Get the model type for this specific generation
      const modelType = modelTypes[index] || "fast";

      // Create a unique request signature to prevent duplicate requests
      const requestSignature = `${promptText}:${style}:${modelType}:${variations[index] || ''}:${index}`;

      // Skip if this exact request is already in progress
      if (pendingRequests.current.has(requestSignature)) {
        // Skip duplicate request
        return;
      }

      // Mark this request as in progress
      pendingRequests.current.add(requestSignature);

      // Generate a unique request ID
      const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          variation: variations[index] || "",
          framework: isCustomStyle ? "custom" : style,
          customStyle: isCustomStyle ? style : undefined,
          model: modelType,
          requestId
        }),
      });

      // Remove from pending requests when done
      pendingRequests.current.delete(requestSignature);

      if (response.status === 409) {
        // Duplicate request detected
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch (err) {
        console.error('Failed to parse JSON response:', err);
        throw new Error('Failed to parse server response');
      }

      if (!response.ok) {
        const errorMessage = data?.error || 'An unknown error occurred';
        const errorDetails = data?.details ? `: ${data.details}` : '';

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
            message: "You have used all your available credits. Please check your dashboard to manage your credits.",
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

        if (response.status === 500 && errorMessage.includes('deduct credits')) {
          console.error(`Credit deduction failed: ${errorMessage}${errorDetails}`);
          setError(`Credit deduction failed: ${errorMessage}${errorDetails}. Please try again or contact support.`);
          return;
        }

        throw new Error(`${errorMessage}${errorDetails}`);
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
  }, [getFramework, appTitles, variations]);

  const handleNewPrompt = async (prompt: string, isUpdate: boolean = false, chaosMode: boolean = false, customNumGenerations?: number) => {
    if (isUpdate) {
      if (chaosMode) {
        // Get the number of generations to update (either from custom input or current config)
        const numToUpdate = customNumGenerations || numGenerations;

        // Update all apps in chaos mode
        setLoadingStates(new Array(numToUpdate).fill(true));

        try {
          // Create an array of promises for all apps
          const updatePromises = appTitles.slice(0, numToUpdate).map(async (title: string, index: number) => {
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

            // Update credits from the last response
            if (data.credits !== undefined) {
              setRemainingCredits(data.credits);
              setTokens(data.credits);
            }
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
          setLoadingStates(new Array(numToUpdate).fill(false));
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
              message: "You have used all your available credits. Please check your dashboard to manage your credits.",
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

          // Update credits
          if (data.credits !== undefined) {
            setRemainingCredits(data.credits);
            setTokens(data.credits);
          }
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
            message: "You have used all your available credits. Please check your dashboard to manage your credits.",
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

        // Update credits
        if (data.credits !== undefined) {
          setRemainingCredits(data.credits);
          setTokens(data.credits);
        }

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

    // Set the last tile to be expanded initially
    setExpandedAppIndex(numGenerations - 1);
    setSelectedAppIndex(numGenerations - 1);

    // Clear any pending requests
    pendingRequests.current.clear();

    // Generate apps in parallel with a small delay between each to avoid overwhelming the server
    // This creates a staggered loading effect that feels more responsive
    const generateAppsWithStagger = async () => {
      const batchSize = 6; // Process in batches for better performance
      const delay = 100; // Small delay between batches

      // Ensure we're generating the correct number of apps based on the config
      // This allows for any number from 1-99 as specified in the requirements
      for (let batch = 0; batch < Math.ceil(numGenerations / batchSize); batch++) {
        const startIdx = batch * batchSize;
        const endIdx = Math.min(startIdx + batchSize, numGenerations);

        // Generate this batch in parallel
        await Promise.all(
          Array.from({ length: endIdx - startIdx }).map((_, i) => {
            const index = startIdx + i;
            return generateApp(index, promptParam);
          })
        );

        // Small delay before next batch if not the last batch
        if (batch < Math.ceil(numGenerations / batchSize) - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };

    generateAppsWithStagger();
  }, [promptParam, numGenerations]);

  // Function to handle clicking on a tile
  const handleTileClick = (index: number) => {
    if (expandedAppIndex === index) {
      // If clicking the already expanded tile, collapse it
      setExpandedAppIndex(null);
    } else {
      // Expand the clicked tile
      setExpandedAppIndex(index);
    }
    setSelectedAppIndex(index);
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

    // Update styles array to keep appTitles in sync
    const newStyles = [...styles];
    newStyles.splice(index, 1);
    // We need to update the styles variable directly since it's derived from config
    // This ensures appTitles will be regenerated correctly
    styles.splice(index, 1);

    // Update model types if they exist
    if (modelTypes) {
      const newModelTypes = [...modelTypes];
      newModelTypes.splice(index, 1);
      // Update modelTypes in a similar way to styles
      modelTypes.splice(index, 1);
    }

    // Update generation times if they exist for this index
    if (generationTimes[index]) {
      const newGenerationTimes = { ...generationTimes };
      delete newGenerationTimes[index];
      // Reindex the keys for remaining items
      const reindexedTimes: {[key: number]: number} = {};
      Object.keys(newGenerationTimes).forEach((key) => {
        const numKey = parseInt(key);
        if (numKey > index) {
          reindexedTimes[numKey - 1] = newGenerationTimes[numKey];
        } else {
          reindexedTimes[numKey] = newGenerationTimes[numKey];
        }
      });
      setGenerationTimes(reindexedTimes);
    }

    // Update selected index if needed
    if (selectedAppIndex >= index && selectedAppIndex > 0) {
      setSelectedAppIndex(selectedAppIndex - 1);
    }

    // If the expanded app is being deleted, collapse it
    if (expandedAppIndex === index) {
      setExpandedAppIndex(null);
    } else if (expandedAppIndex !== null && expandedAppIndex > index) {
      // Adjust the expanded index if it's after the deleted item
      setExpandedAppIndex(expandedAppIndex - 1);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-zinc-900">
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
        className={`w-full min-h-screen p-4 sm:p-6 md:p-8 pb-20 ${
          theme === "dark" ? "bg-gray-900" : ""
        }`}
      >
        <div
          className={`max-w-7xl mx-auto ${
            theme === "light" ? "backdrop-blur-sm" : ""
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-lg sm:text-xl ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              <Link href="/">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300 cursor-pointer hover:opacity-80 transition-opacity">
                  Chaos Coder
                </span>
              </Link>
            </motion.h1>
            <div className="flex items-center gap-3 sm:gap-4">
              <ThemeToggle />
              <Link
                href="/"
                className={`hover:underline transition-colors ${
                  theme === "dark"
                    ? "text-gray-300 hover:text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                ← Back to Prompt
              </Link>
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
            <div className="min-h-[calc(100vh-10rem)] space-y-6 sm:space-y-8" ref={containerRef}>
              {/* Grid of all app previews */}
              <AnimatePresence>
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-lg sm:text-xl font-semibold mb-4 ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  All Designs
                </motion.h2>
              </AnimatePresence>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <AnimatePresence>
                  {appTitles.map((title: string, index: number) => (
                    <motion.div
                      key={index}
                      layout
                      className={`${
                        expandedAppIndex === index ? "col-span-full" : ""
                      }`}
                    >
                      <AppTile
                        title={title}
                        isSelected={selectedAppIndex === index}
                        onClick={() => handleTileClick(index)}
                        onDelete={() => handleDeleteApp(index)}
                        isLoading={loadingStates[index]}
                        theme={theme}
                        isExpanded={expandedAppIndex === index}
                        code={editedResults[index] || ""}
                        onChange={(newCode) => {
                          const newResults = [...editedResults];
                          newResults[index] = newCode;
                          setEditedResults(newResults);
                        }}
                      />
                    </motion.div>
                  ))}
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
        onNumGenerationsChange={(num) => {
          // Update the local state for numGenerations
          // This doesn't change the context value, just the local config
          if (config) {
            config.numGenerations = num;
          }
        }}
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
    </div>
  );
}

// Main component with Suspense boundary
export default function Results() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center p-8">
          <div className="relative mb-8 mx-auto">
            {/* Multi-layered spinner with different colors and animations */}
            <div className="w-20 h-20 border-[3px] border-blue-400/10 border-t-blue-500/80 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-20 h-20 border-[3px] border-transparent border-r-indigo-400/70 rounded-full animate-spin animate-[spin_1.5s_linear_infinite_0.2s]"></div>
            <div className="absolute top-[3px] left-[3px] w-[74px] h-[74px] border-[3px] border-transparent border-b-purple-400/60 rounded-full animate-spin animate-[spin_2s_linear_infinite_0.3s] origin-center"></div>
            <div className="absolute top-[6px] left-[6px] w-[68px] h-[68px] border-[3px] border-transparent border-l-rose-400/50 rounded-full animate-spin animate-[spin_2.5s_linear_infinite_0.4s] origin-center"></div>

            {/* Pulsing dot in the center */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
          </div>

          <h2 className="text-xl font-semibold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
            Loading Your Designs
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
            Preparing your web applications...
          </p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
