"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { SignupModal } from "@/components/SignupModal";
import { FaPlus, FaMinus } from "react-icons/fa";
import { AlertModal } from "@/components/AlertModal";
import { toast } from "react-hot-toast";
import Image from "next/image";
export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [numGenerations, setNumGenerations] = useState(3);
  const [selectedModel, setSelectedModel] = useState<"fast" | "pro">("fast");
  const [vibes, setVibes] = useState<string[]>([
    "tailwind",
    "bootstrap",
    "materialize",
  ]);
  const [customVibes, setCustomVibes] = useState<string[]>(["", "", ""]);
  const router = useRouter();

  // Predefined vibes from frameworkPrompts
  const predefinedVibes = [
    { value: "tailwind", label: "Tailwind CSS" },
    { value: "materialize", label: "Materialize" },
    { value: "bootstrap", label: "Bootstrap" },
    { value: "patternfly", label: "PatternFly" },
    { value: "pure", label: "Pure CSS" },
    { value: "custom", label: "Custom" },
  ];

  const [isLoading, setIsLoading] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{
    title: string;
    message: string;
    type: "auth" | "credits";
  }>({
    title: "",
    message: "",
    type: "auth",
  });

  // Calculate total cost
  const calculateCost = () => {
    return numGenerations * (selectedModel === "fast" ? 1 : 5);
  };

  // Handle number of generations changes
  const incrementGenerations = () => {
    if (numGenerations < 9) {
      setNumGenerations((prev) => {
        const newNum = prev + 1;
        // Add a default vibe for the new generation
        setVibes((current) => [...current, "tailwind"]);
        setCustomVibes((current) => [...current, ""]);
        return newNum;
      });
    }
  };

  const decrementGenerations = () => {
    if (numGenerations > 1) {
      setNumGenerations((prev) => {
        const newNum = prev - 1;
        // Remove vibe from the last generation
        setVibes((current) => current.slice(0, newNum));
        setCustomVibes((current) => current.slice(0, newNum));
        return newNum;
      });
    }
  };

  // Handle vibe selection
  const handleVibeChange = (index: number, value: string) => {
    setVibes((current) => {
      const newVibes = [...current];
      newVibes[index] = value;
      return newVibes;
    });
  };

  // Handle custom vibe input
  const handleCustomVibeChange = (index: number, value: string) => {
    setCustomVibes((current) => {
      const newCustomVibes = [...current];
      newCustomVibes[index] = value;
      return newCustomVibes;
    });
  };

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
          message:
            "You need to sign in to generate web apps. Sign in to continue.",
          type: "auth",
        });
        setShowAlertModal(true);
        setIsLoading(false);
        return;
      }

      if (response.status === 402) {
        // Insufficient credits error
        setAlertInfo({
          title: "No Credits Remaining",
          message:
            "You have used all your available credits. Subscribe to a plan to get more credits.",
          type: "credits",
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
      // Proceed with the redirect and pass the config
      const encodedPrompt = encodeURIComponent(prompt);
      const encodedConfig = encodeURIComponent(
        JSON.stringify({
          numGenerations,
          model: selectedModel,
          vibes: vibes.map((vibe, i) =>
            vibe === "custom" ? customVibes[i] : vibe
          ),
        })
      );

      router.push(`/results?prompt=${encodedPrompt}&config=${encodedConfig}`);
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

                <div className="mb-4 space-y-4">
                  {/* Configuration options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Number of generations */}
                    <div className="p-3 bg-[#1a1f2e]/50 border border-[#2a3040] rounded-lg">
                      <div className="text-sm text-gray-300 mb-2">
                        Number of Generations
                      </div>
                      <div className="flex items-center justify-center">
                        <button
                          onClick={decrementGenerations}
                          className="p-2 rounded-lg bg-[#1a1f2e]/70 border border-[#2a3040] text-gray-400 hover:text-gray-200"
                        >
                          <FaMinus className="w-3 h-3" />
                        </button>
                        <div className="mx-3 text-lg text-gray-200 font-medium">
                          {numGenerations}
                        </div>
                        <button
                          onClick={incrementGenerations}
                          className="p-2 rounded-lg bg-[#1a1f2e]/70 border border-[#2a3040] text-gray-400 hover:text-gray-200"
                        >
                          <FaPlus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Model Selection */}
                    <div className="p-3 bg-[#1a1f2e]/50 border border-[#2a3040] rounded-lg">
                      <div className="text-sm text-gray-300 mb-2">
                        Model (cost per generation)
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedModel("fast")}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium ${
                            selectedModel === "fast"
                              ? "bg-blue-600 text-white"
                              : "bg-[#1a1f2e]/70 border border-[#2a3040] text-gray-300 hover:text-gray-100"
                          }`}
                        >
                          <span className="flex justify-center items-center">
                            Fast Model <span className="mx-1">•</span> (1
                            <Image
                              src="/coin.png"
                              alt="credits"
                              width={16}
                              height={16}
                            />
                            )
                          </span>
                        </button>
                        <button
                          onClick={() => setSelectedModel("pro")}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium ${
                            selectedModel === "pro"
                              ? "bg-purple-600 text-white"
                              : "bg-[#1a1f2e]/70 border border-[#2a3040] text-gray-300 hover:text-gray-100"
                          }`}
                        >
                          <span className="flex justify-center items-center">
                            Pro Model <span className="mx-1">•</span> (5
                            <Image
                              src="/coin.png"
                              alt="Credits"
                              width={16}
                              height={16}
                            />
                            )
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Vibes configuration for each generation */}
                  <div className="p-3 bg-[#1a1f2e]/50 border border-[#2a3040] rounded-lg">
                    <div className="text-sm text-gray-300 mb-2">
                      Vibe Settings
                    </div>
                    <div className="space-y-3">
                      {Array.from({ length: numGenerations }).map(
                        (_, index) => (
                          <div
                            key={index}
                            className="flex flex-col sm:flex-row gap-2"
                          >
                            <div className="flex-none text-xs text-gray-400 sm:pt-2 mb-1 sm:mb-0 sm:w-24">
                              Generation {index + 1}:
                            </div>
                            <select
                              value={vibes[index]}
                              onChange={(e) =>
                                handleVibeChange(index, e.target.value)
                              }
                              className="flex-1 py-1 px-3 bg-[#1a1f2e]/70 border border-[#2a3040] rounded-lg text-sm text-gray-300"
                            >
                              {predefinedVibes.map((vibe) => (
                                <option key={vibe.value} value={vibe.value}>
                                  {vibe.label}
                                </option>
                              ))}
                            </select>
                            {vibes[index] === "custom" && (
                              <input
                                type="text"
                                value={customVibes[index]}
                                onChange={(e) =>
                                  handleCustomVibeChange(index, e.target.value)
                                }
                                placeholder="Enter custom vibe instructions..."
                                className="flex-1 py-1 px-3 bg-[#1a1f2e]/70 border border-[#2a3040] rounded-lg text-sm text-gray-300"
                              />
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <RainbowButton
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 text-lg font-medium"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center">
                      Generate Web Apps <span className="mx-1">•</span> (
                      <span className="flex items-center">
                        {calculateCost()}
                          <Image
                            src="/coin.png"
                            alt="Credits"
                            width={16}
                            height={16}
                          />
                      </span>
                      )
                    </span>
                  )}
                </RainbowButton>

                <div className="mt-4 text-center text-sm text-gray-400">
                  <p>
                    This is an early preview. Open source at{" "}
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
