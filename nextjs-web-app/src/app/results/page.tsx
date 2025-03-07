"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AuroraBackground } from "@/components/ui/aurora-background";
import CodePreviewPanel from "@/components/CodePreviewPanel";
import { BrowserContainer } from "@/components/ui/browser-container";
import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";
import PromptInput from "@/components/DevTools/PromptInput";
import PerformanceMetrics from "@/components/DevTools/PerformanceMetrics";
import VoiceInput from "@/components/DevTools/VoiceInput";
import MockDeployButton from "@/components/MockDeployButton";
import { SignupModal } from "../page";
import styled from "styled-components";

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

// Define LoadingBar and LoadingProgress directly in this file
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
  const NUM_APPS = 9; // Single variable to control number of apps
  
  const searchParams = useSearchParams();
  const [loadingStates, setLoadingStates] = useState<boolean[]>(
    new Array(NUM_APPS).fill(true)
  );
  const [results, setResults] = useState<string[]>(new Array(NUM_APPS).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [selectedAppIndex, setSelectedAppIndex] = useState(0);
  const [editedResults, setEditedResults] = useState<string[]>(
    new Array(NUM_APPS).fill("")
  );
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const [generationTimes, setGenerationTimes] = useState<{
    [key: number]: number;
  }>({});
  const [isVoiceEnabled] = useState(true);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const { theme } = useTheme();

  const variations = [
    "",
    "Make it handle data processing and analysis tasks with pandas and numpy.",
    "Focus on simplicity and performance. Create a command-line interface with argparse.",
    "Add some creative features using web frameworks like Flask or FastAPI.",
    "Create an enhanced version with additional features and modern Python patterns.",
    "Build a version with automation capabilities for files, scheduling, or system tasks.",
    "Create a version optimized for data visualization with matplotlib or seaborn.",
    "Build a version with advanced error handling and logging capabilities.",
    "Create a version with database integration using SQLAlchemy.",
    "Build a version with API integration and external service connections.",
  ];

  const appTitles = [
    "Basic Python Script",
    "Data Processing Script",
    "CLI Script",
    "Web API Script",
    "Enhanced Script",
    "Automation Script",
    "Data Visualization",
    "Error Handling Script",
    "Database Script",
    "API Integration Script",
  ];

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
      const scriptType =
        appTitles[index] === "Basic Python Script"
          ? "basic"
          : appTitles[index] === "Data Processing Script"
          ? "data"
          : appTitles[index] === "CLI Script"
          ? "cli"
          : appTitles[index] === "Web API Script"
          ? "web"
          : appTitles[index] === "Automation Script"
          ? "automation"
          : "basic";

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          variation: variations[index],
          scriptType,
        }),
      });

      if (response.status === 429) {
        // Show signup modal for rate limit
        setShowSignupModal(true);
        throw new Error("Rate limit exceeded. Please create an account to continue.");
      }

      if (!response.ok) {
        throw new Error(`Failed to generate app ${index + 1}`);
      }

      const data = await response.json();
      if (data.error === "rate_limit_exceeded") {
        setShowSignupModal(true);
        throw new Error("Rate limit exceeded. Please create an account to continue.");
      } else if (data.error) {
        throw new Error(data.error);
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
            const scriptType =
              title === "Basic Python Script"
                ? "basic"
                : title === "Data Processing Script"
                ? "data"
                : title === "CLI Script"
                ? "cli"
                : title === "Web API Script"
                ? "web"
                : title === "Automation Script"
                ? "automation"
                : "basic";

            const response = await fetch("/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt,
                existingCode: editedResults[index],
                scriptType,
                isUpdate: true,
              }),
            });

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
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to update applications in chaos mode"
          );
        } finally {
          setLoadingStates(new Array(6).fill(false));
        }
      } else {
        // Update only the selected app (original behavior)
        setLoadingStates((prev) => {
          const newStates = [...prev];
          newStates[selectedAppIndex] = true;
          return newStates;
        });

        try {
          const scriptType =
            appTitles[selectedAppIndex] === "Basic Python Script"
              ? "basic"
              : appTitles[selectedAppIndex] === "Data Processing Script"
              ? "data"
              : appTitles[selectedAppIndex] === "CLI Script"
              ? "cli"
              : appTitles[selectedAppIndex] === "Web API Script"
              ? "web"
              : appTitles[selectedAppIndex] === "Automation Script"
              ? "automation"
              : "basic";

          const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              existingCode: editedResults[selectedAppIndex],
              scriptType,
              isUpdate: true,
            }),
          });

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
      setLoadingStates(new Array(NUM_APPS).fill(true));
      setResults(new Array(NUM_APPS).fill(""));
      setEditedResults(new Array(NUM_APPS).fill(""));
      setGenerationTimes({});
      Promise.all(variations.map((_, index) => generateApp(index, prompt)));
    }
  };

  const handleVoiceInput = (text: string) => {
    handleNewPrompt(text, true, false); // Default to single mode for voice input
  };

  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (!prompt) {
      setError("No prompt provided");
      setLoadingStates(new Array(NUM_APPS).fill(false));
      return;
    }

    // Generate all apps in parallel
    Promise.all(variations.map((_, index) => generateApp(index, prompt)));
  }, [searchParams]);

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
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300 ">
                Chaos Coder
              </span>
            </motion.h1>
            <div className="flex items-center gap-4">
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

            {/* <ThemeToggle /> */}
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
      <PromptInput
        isOpen={isPromptOpen}
        onSubmit={handleNewPrompt}
        isUpdateMode={true}
        currentCode={editedResults[selectedAppIndex]}
      />
      <PerformanceMetrics
        isOpen={isMetricsOpen}
        onClose={() => setIsMetricsOpen(false)}
        generationTimes={generationTimes}
      />
      {isVoiceEnabled && (
        <VoiceInput onInput={(text) => handleVoiceInput(text)} theme={theme} />
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
