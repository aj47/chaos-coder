"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AuroraBackground } from "@/components/ui/aurora-background";
import CodePreviewPanel from "@/components/CodePreviewPanel";
import { useTheme } from "@/context/ThemeContext";
import PromptInput from "@/components/DevTools/PromptInput";
import PerformanceMetrics from "@/components/DevTools/PerformanceMetrics";
import VoiceInput from "@/components/DevTools/VoiceInput";
import { SignupModal } from "../page";
import styled from "styled-components";
import CodeExecutionPanel from "@/components/CodeExecutionPanel";
import { SunIcon, MoonIcon, MicrophoneIcon } from "@heroicons/react/24/outline";

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
  const { theme, toggleTheme } = useTheme();
  const [activePanel, setActivePanel] = useState<'preview' | 'execution'>('execution');
  const [promptText, setPromptText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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
      console.error("Error generating app:", err);
    } finally {
      setLoadingStates((prev) => {
        const newStates = [...prev];
        newStates[index] = false;
        return newStates;
      });
    }
  };

  const handleNewPrompt = async (prompt: string) => {
    setIsGenerating(true);
    setLoadingStates(new Array(NUM_APPS).fill(true));
    setEditedResults(new Array(NUM_APPS).fill(""));
    setGenerationTimes({});
    
    try {
      // Generate all apps in parallel
      await Promise.all(variations.map((_, index) => generateApp(index, prompt)));
    } catch (error) {
      console.error("Error generating apps:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVoiceInput = (text: string) => {
    handleNewPrompt(text);
  };

  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (!prompt) {
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>
              Python Code Generator
            </h1>
            <p className={`mt-2 ${
              theme === "dark" ? "text-gray-300" : "text-gray-600"
            }`}>
              Generate and execute Python code with AI
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full ${
                theme === "dark" ? "bg-gray-700 text-white" : "bg-gray-200 text-gray-800"
              }`}
            >
              {theme === "dark" ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <label
                htmlFor="prompt"
                className={`block text-sm font-medium mb-1 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                What would you like to create?
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="prompt"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleNewPrompt(promptText);
                    }
                  }}
                  placeholder="Describe the Python code you want to generate..."
                  className={`w-full p-3 pr-10 rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-800 text-white border-gray-700"
                      : "bg-white text-gray-900 border-gray-300"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <button
                  onClick={() => handleVoiceInput(promptText)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <MicrophoneIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <button
              onClick={() => handleNewPrompt(promptText)}
              disabled={isGenerating}
              className={`px-4 py-3 rounded-lg font-medium ${
                isGenerating
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : theme === "dark"
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              } transition-colors`}
            >
              {isGenerating ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {variations.map((variation, index) => (
            <div
              key={index}
              onClick={() => handleTileClick(index)}
              className={`relative rounded-lg overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 ${
                selectedAppIndex === index
                  ? "ring-4 ring-blue-500"
                  : "hover:shadow-xl"
              } ${
                theme === "dark" ? "bg-gray-800" : "bg-white shadow-md"
              }`}
            >
              {loadingStates[index] ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="h-48 overflow-hidden">
                  <div
                    className={`p-4 h-full overflow-hidden font-mono text-xs ${
                      theme === "dark" ? "text-gray-300" : "text-gray-800"
                    }`}
                  >
                    <pre className="whitespace-pre-wrap">
                      {editedResults[index]
                        ? editedResults[index].slice(0, 500) +
                          (editedResults[index].length > 500 ? "..." : "")
                        : "No code generated yet"}
                    </pre>
                  </div>
                </div>
              )}
              <div
                className={`p-4 border-t ${
                  theme === "dark" ? "border-gray-700" : "border-gray-200"
                }`}
              >
                <h3
                  className={`font-semibold ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  {appTitles[index]}
                </h3>
                <p
                  className={`text-sm mt-1 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {variations[index]}
                </p>
              </div>
            </div>
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
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-xl font-semibold ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>
              {appTitles[selectedAppIndex]} - Detailed View
            </h2>
            <div className="space-x-2">
              <button
                onClick={() => setActivePanel('execution')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activePanel === 'execution'
                    ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                    : theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Code Execution
              </button>
              <button
                onClick={() => setActivePanel('preview')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activePanel === 'preview'
                    ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                    : theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                HTML Preview
              </button>
            </div>
          </div>
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
              <div className="relative h-full">
                {activePanel === 'execution' ? (
                  <CodeExecutionPanel
                    code={editedResults[selectedAppIndex] || ""}
                    onChange={handleCodeChange}
                    theme={theme}
                  />
                ) : (
                  <CodePreviewPanel
                    code={editedResults[selectedAppIndex] || ""}
                    onChange={handleCodeChange}
                    theme={theme}
                  />
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
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
    <div className="w-full h-screen flex items-center justify-center">
      <ResultsContent />
    </div>
  );
}
