"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AuroraBackground } from "@/components/ui/aurora-background";
import AppTile from "@/components/AppTile";
import CodePreviewPanel from "@/components/CodePreviewPanel";
import { BrowserContainer } from "@/components/ui/browser-container";
import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";
import PromptInput from "@/components/DevTools/PromptInput";

import VoiceInput from "@/components/DevTools/VoiceInput";
import FullscreenPreview from "@/components/FullscreenPreview";
import MockDeployButton from "@/components/MockDeployButton";
import { SignupModal } from "@/components/SignupModal";
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

// Move constants outside component to prevent recreation on every render
const MAX_APPS = 6; // Maximum number of apps that can be generated

const variations = [
  "",
  "Make it visually appealing and use a different framework than the other versions.",
  "Focus on simplicity and performance. Use minimal dependencies.",
  "Add some creative features that might not be explicitly mentioned in the prompt.",
  "Create an enhanced version with additional features and modern design patterns.",
  "Build a version with accessibility and internationalization features in mind.",
];

const appTitles = [
  "Standard Version",
  "Visual Focus",
  "Minimalist Version",
  "Creative Approach",
  "Enhanced Version",
  "Accessible Version",
];

// Wrapper component that uses searchParams
function ResultsContent() {
  const searchParams = useSearchParams();

  // Get the number of generations from URL params, default to 3, max 6
  const numGenerations = Math.min(
    Math.max(parseInt(searchParams.get("numGenerations") || "3"), 1),
    MAX_APPS
  );

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

  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const { theme } = useTheme();

  // Get framework for each app title
  const getFramework = useCallback((title: string) => {
    switch (title) {
      case "Standard Version": return "tailwind";
      case "Visual Focus": return "bootstrap";
      case "Minimalist Version": return "pure";
      case "Creative Approach": return "materialize";
      case "Enhanced Version": return "tailwind";
      case "Accessible Version": return "foundation";
      case "Mobile Optimized": return "bootstrap";
      case "Interactive Version": return "materialize";
      case "Data Visualization": return "tailwind";
      case "Progressive Web App": return "tailwind";
      default: return "tailwind";
    }
  }, []);

  const generateApp = useCallback(async (index: number, promptText: string) => {
    try {
      const framework = getFramework(appTitles[index]);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          variation: variations[index],
          framework,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate app ${index + 1}`);
      }

      const data = await response.json();
      if (data.error) {
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
  }, [getFramework, variations]);

  // Handler functions
  const handleNewPrompt = async (prompt: string, isUpdate: boolean = false, chaosMode: boolean = false) => {
    // For now, just redirect to new generation
    window.location.href = `/results?prompt=${encodeURIComponent(prompt)}`;
  };

  const handleVoiceInput = (text: string) => {
    handleNewPrompt(text, true, false);
  };

  const handleCodeChange = (newCode: string) => {
    const newResults = [...editedResults];
    newResults[selectedAppIndex] = newCode;
    setEditedResults(newResults);
  };

  const handleTileClick = (index: number) => {
    setSelectedAppIndex(index);
    setTimeout(() => {
      document.getElementById('detailed-view')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  const handleMaximize = () => {
    setIsFullscreenOpen(true);
  };

  const handleCloseFullscreen = () => {
    setIsFullscreenOpen(false);
  };

  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (!prompt) {
      setError("No prompt provided");
      setLoadingStates(new Array(numGenerations).fill(false));
      return;
    }

    // Generate all apps
    for (let i = 0; i < numGenerations; i++) {
      generateApp(i, prompt);
    }
  }, [searchParams, generateApp, numGenerations]);

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
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300 ">
                Chaos Coder
              </span>
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
            <div className="space-y-6 sm:space-y-8">
              {/* Expanded view of selected app - moved to top */}
              <motion.div
                id="detailed-view"
                className="mb-6 sm:mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <h2 className={`text-lg sm:text-xl font-semibold mb-4 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}>
                  {appTitles[selectedAppIndex]} - Detailed View
                </h2>
                <div className="h-[300px] sm:h-[400px] md:h-[500px]">
                  <BrowserContainer
                    theme={theme}
                    title={`${appTitles[selectedAppIndex]} - Detailed View`}
                    onMaximize={handleMaximize}
                  >
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
                          onMaximize={handleMaximize}
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

              {/* Grid of all app previews - moved below detailed view */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {appTitles.slice(0, numGenerations).map((title, index) => (
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
                    <div className="h-[200px] sm:h-[250px] md:h-[300px]">
                      <BrowserContainer
                        theme={theme}
                        title={title}
                        onMaximize={() => {
                          setSelectedAppIndex(index);
                          handleMaximize();
                        }}
                      >
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

      {isVoiceEnabled && (
        <VoiceInput onInput={(text) => handleVoiceInput(text)} theme={theme} />
      )}
      <FullscreenPreview
        isOpen={isFullscreenOpen}
        onClose={handleCloseFullscreen}
        code={editedResults[selectedAppIndex] || ""}
        title={appTitles[selectedAppIndex]}
        theme={theme}
      />
    </AuroraBackground>
  );
}

// Main component with Suspense boundary
export default function Results() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4 text-white">Loading...</h2>
          <div className="w-16 h-16 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
