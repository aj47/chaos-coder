"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { useTheme } from "@/context/ThemeContext";
import PromptInput from "@/components/DevTools/PromptInput";
import PerformanceMetrics from "@/components/DevTools/PerformanceMetrics";
import VoiceInput from "@/components/DevTools/VoiceInput";
import { SignupModal } from "@/components/SignupModal";
import { AlertModal } from "@/components/AlertModal";
import { useAuth } from "@/context/AuthContext";
import AppTile from "@/components/AppTile";

// Wrapper component that uses requestId from route
function ResultsContent() {
  const params = useParams();
  const requestId = params.requestId as string;
  
  const [loadingStates, setLoadingStates] = useState<boolean[]>([]);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppIndex, setSelectedAppIndex] = useState<number>(0);
  const [expandedAppIndex, setExpandedAppIndex] = useState<number | null>(null);
  const [editedResults, setEditedResults] = useState<string[]>([]);
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
  const [requestData, setRequestData] = useState<{
    prompt: string;
    config: {
      numGenerations: number;
      styles: string[];
      modelTypes: string[];
    };
  } | null>(null);
  
  const { theme } = useTheme();
  const { setTokens } = useAuth();

  // Load request data and existing generations
  useEffect(() => {
    const loadRequestData = async () => {
      try {
        const response = await fetch(`/api/requests/${requestId}`);
        if (!response.ok) {
          throw new Error('Failed to load request data');
        }
        
        const data = await response.json();
        setRequestData(data);
        
        // Initialize states based on request data
        const initialLoadingStates = new Array(data.config.numGenerations).fill(true);
        setLoadingStates(initialLoadingStates);
        
        const initialResults = new Array(data.config.numGenerations).fill("");
        setResults(initialResults);
        setEditedResults(initialResults);
        
        // Load any existing generations
        const genResponse = await fetch(`/api/generations/${requestId}`);
        if (genResponse.ok) {
          const { generations } = await genResponse.json();
          if (generations?.length) {
            console.log('Found existing generations:', generations.length);
            
            // Process existing generations
            const codes = generations.map((g: { code: string }) => g.code);
            setResults(codes);
            setEditedResults(codes);
            setLoadingStates(new Array(data.config.numGenerations).fill(false));
            
            // Set generation times if available
            const times: {[key: number]: number} = {};
            generations.forEach((g: { generation_time?: number }, i: number) => {
              if (g.generation_time) times[i] = g.generation_time;
            });
            setGenerationTimes(times);
          } else {
            // No existing generations, start the generation process
            console.log('No existing generations found, starting generation process');
            generateAppsWithStagger(data);
          }
        } else {
          // Error fetching generations, start the generation process
          console.log('Error fetching generations, starting generation process');
          generateAppsWithStagger(data);
        }
        
        // Set the last tile to be expanded initially
        setExpandedAppIndex(data.config.numGenerations - 1);
        setSelectedAppIndex(data.config.numGenerations - 1);
      } catch (err) {
        console.error('Error loading request data:', err);
        setError('Failed to load request data');
      }
    };
    
    // Helper function to generate apps with staggered timing
    const generateAppsWithStagger = async (data: { 
      config: { numGenerations: number },
      prompt: string 
    }) => {
      const batchSize = 3;
      const delay = 500;
      
      for (let batch = 0; batch < Math.ceil(data.config.numGenerations / batchSize); batch++) {
        const startIdx = batch * batchSize;
        const endIdx = Math.min(startIdx + batchSize, data.config.numGenerations);
        
        await Promise.all(
          Array.from({ length: endIdx - startIdx }).map((_, i) => {
            const index = startIdx + i;
            return generateApp(index, data.prompt);
          })
        );
        
        if (batch < Math.ceil(data.config.numGenerations / batchSize) - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };
    
    if (requestId) {
      loadRequestData();
    }
  }, [requestId]); // Only depend on requestId

  // Generate app with database storage
  const generateApp = async (index: number, promptText: string) => {
    if (!requestData) return;
    
    const startTime = performance.now();
    try {
      const style = requestData.config.styles[index];
      const modelType = requestData.config.modelTypes[index] || "fast";
      
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          style,
          modelType,
          requestId,
          index
        }),
      });

      if (response.status === 401) {
        setAlertInfo({
          title: "Authentication Required",
          message: "You need to sign in to generate web apps. Sign in to continue.",
          type: 'auth'
        });
        setShowAlertModal(true);
        return;
      }
      
      if (response.status === 402) {
        setAlertInfo({
          title: "No Credits Remaining",
          message: "You have used all your available credits. Please check your dashboard to manage your credits.",
          type: 'credits'
        });
        setShowAlertModal(true);
        return;
      }
      
      if (response.status === 429) {
        setShowSignupModal(true);
        throw new Error("Rate limit exceeded. Please create an account to continue.");
      }

      const data = await response.json();

      if (data.credits !== undefined) {
        setRemainingCredits(data.credits);
        setTokens(data.credits);
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
        [index]: (endTime - startTime) / 1000,
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

  // Handle tile click
  const handleTileClick = (index: number) => {
    if (expandedAppIndex === index) {
      setExpandedAppIndex(null);
    } else {
      setExpandedAppIndex(index);
    }
    setSelectedAppIndex(index);
  };

  // Handle app deletion
  const handleDeleteApp = (index: number) => {
    if (!requestData) return;
    
    const newLoadingStates = [...loadingStates];
    newLoadingStates.splice(index, 1);
    setLoadingStates(newLoadingStates);
    
    const newResults = [...results];
    newResults.splice(index, 1);
    setResults(newResults);
    
    const newEditedResults = [...editedResults];
    newEditedResults.splice(index, 1);
    setEditedResults(newEditedResults);
    
    // Update generation times
    if (generationTimes[index]) {
      const newGenerationTimes = { ...generationTimes };
      delete newGenerationTimes[index];
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
    
    if (selectedAppIndex >= index && selectedAppIndex > 0) {
      setSelectedAppIndex(selectedAppIndex - 1);
    }
    
    if (expandedAppIndex === index) {
      setExpandedAppIndex(null);
    } else if (expandedAppIndex !== null && expandedAppIndex > index) {
      setExpandedAppIndex(expandedAppIndex - 1);
    }
    
    // Update the request config
    const newConfig = {
      ...requestData.config,
      numGenerations: requestData.config.numGenerations - 1,
      styles: requestData.config.styles.filter((_, i) => i !== index),
      modelTypes: requestData.config.modelTypes.filter((_, i) => i !== index)
    };
    setRequestData({
      ...requestData,
      config: newConfig
    });
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
            theme === "dark" ? "" : "backdrop-blur-sm"
          }`}
        >
          {/* Back button */}
          <div className="mb-4">
            <button
              onClick={() => window.location.href = '/'}
              className={`flex items-center px-4 py-2 rounded-lg ${
                theme === "dark" 
                  ? "bg-gray-800 hover:bg-gray-700 text-gray-200" 
                  : "bg-white/80 hover:bg-white/90 text-gray-800"
              } transition-colors duration-200`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Home
            </button>
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

          {requestData && results.length > 0 && (
            <div className="h-[calc(100vh-10rem)] overflow-y-auto">
              <AnimatePresence>
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-xl font-semibold mb-4 ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  Generated Designs
                </motion.h2>
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {requestData.config.styles.map((style, index) => (
                    <motion.div
                      key={index}
                      layout
                      className={`${
                        expandedAppIndex === index ? "col-span-full" : ""
                      }`}
                    >
                      <AppTile
                        title={style}
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
      
      {isVoiceEnabled && (
        <VoiceInput onInput={() => {}} theme={theme} />
      )}
      
      <PromptInput
        isOpen={false}
        onSubmit={() => {}}
        isUpdateMode={true}
        numGenerations={requestData?.config.numGenerations || 0}
      />
      
      <PerformanceMetrics
        isOpen={isMetricsOpen}
        onClose={() => setIsMetricsOpen(false)}
        generationTimes={generationTimes}
      />
      
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
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center p-8">
          <div className="relative mb-8 mx-auto">
            <div className="w-20 h-20 border-[3px] border-blue-400/10 border-t-blue-500/80 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-20 h-20 border-[3px] border-transparent border-r-indigo-400/70 rounded-full animate-spin animate-[spin_1.5s_linear_infinite_0.2s]"></div>
            <div className="absolute top-[3px] left-[3px] w-[74px] h-[74px] border-[3px] border-transparent border-b-purple-400/60 rounded-full animate-spin animate-[spin_2s_linear_infinite_0.3s] origin-center"></div>
            <div className="absolute top-[6px] left-[6px] w-[68px] h-[68px] border-[3px] border-transparent border-l-rose-400/50 rounded-full animate-spin animate-[spin_2.5s_linear_infinite_0.4s] origin-center"></div>
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