"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { createClient } from "@/lib/supabase/client";
import { FaKey, FaRobot, FaSave, FaArrowLeft } from "react-icons/fa";

// List of supported Anthropic models
const ANTHROPIC_MODELS = [
  { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
  { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet" },
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
  { id: "claude-2.1", name: "Claude 2.1" },
  { id: "claude-2.0", name: "Claude 2.0" },
  { id: "claude-instant-1.2", name: "Claude Instant 1.2" },
];

export default function SettingsPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API key and model settings
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState(ANTHROPIC_MODELS[0].id);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          throw new Error(error.message);
        }

        if (!data?.user) {
          router.push("/");
          return;
        }
      } catch (err) {
        console.error("Error checking user:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    // Load saved settings from localStorage
    const loadSavedSettings = () => {
      if (typeof window !== "undefined") {
        const savedApiKey = localStorage.getItem("anthropicApiKey");
        const savedModel = localStorage.getItem("selectedModel");

        if (savedApiKey) {
          setAnthropicApiKey(savedApiKey);
        }

        if (savedModel) {
          setSelectedModel(savedModel);
        }
      }
    };

    checkUser();
    loadSavedSettings();
  }, [router]);

  const saveSettings = () => {
    // Save settings to localStorage
    localStorage.setItem("anthropicApiKey", anthropicApiKey);
    localStorage.setItem("selectedModel", selectedModel);

    // Show success message
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-indigo-500 border-indigo-200 rounded-full animate-spin mx-auto mb-4"></div>
          <p
            className={`text-sm ${
              theme === "dark" ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Loading settings...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 ${
          theme === "dark"
            ? "bg-gray-900 text-white"
            : "bg-gray-50 text-gray-900"
        }`}
      >
        <div
          className={`w-full max-w-md p-6 rounded-lg ${
            theme === "dark" ? "bg-gray-800" : "bg-white shadow-md"
          }`}
        >
          <h2 className="text-xl font-bold mb-4">Error</h2>
          <p className="mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-2 px-4 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white transition-all"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Settings</h1>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white transition-all flex items-center gap-2"
          >
            <FaArrowLeft className="w-3.5 h-3.5" />
            Return to App
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Billing & Credits (moved from dashboard) */}
          <div
            className={`p-6 rounded-lg ${
              theme === "dark" ? "bg-gray-800" : "bg-white shadow-md"
            }`}
          >
            <h2 className="text-xl font-bold mb-4">Billing & Credits</h2>
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Current Plan</h3>
              <div
                className={`p-4 rounded-lg border ${
                  theme === "dark" ? "border-gray-700" : "border-gray-200"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">Free Plan</p>
                    <p className="text-sm opacity-75">
                      25 generations per month
                    </p>
                  </div>
                  <button className="px-4 py-2 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white transition-all">
                    Upgrade
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Available Credits</h3>
              <div
                className={`p-4 rounded-lg border ${
                  theme === "dark" ? "border-gray-700" : "border-gray-200"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">15 / 25</p>
                    <p className="text-sm opacity-75">
                      Credits remaining this month
                    </p>
                  </div>
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                      style={{ width: "60%" }}
                      role="progressbar"
                      aria-valuenow={60}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* API Settings */}
          <div
            className={`p-6 rounded-lg ${
              theme === "dark" ? "bg-gray-800" : "bg-white shadow-md"
            }`}
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaKey className="text-indigo-500" />
              Local API Settings ( Anthropic )
            </h2>
            <p className="text-sm opacity-75 mb-4">
              Please note that the provided API key is stored in your browser's
              local storage and is not sent to our servers. We maintain the
              privacy and security of your API keys.
            </p>
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="anthropicApiKey"
                  className="block text-sm font-medium mb-2"
                >
                  Anthropic API Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="anthropicApiKey"
                    value={anthropicApiKey}
                    onChange={(e) => setAnthropicApiKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className={`w-full p-3 rounded-lg border ${
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Your API key will be stored locally in your browser and never
                  sent to our servers.
                </p>
              </div>

              <div>
                <label
                  htmlFor="modelSelect"
                  className="block text-sm font-medium mb-2 flex items-center gap-2"
                >
                  <FaRobot className="text-indigo-500" />
                  Anthropic Model
                </label>
                <select
                  id="modelSelect"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className={`w-full p-3 rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  } focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                >
                  {ANTHROPIC_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-gray-500">
                  Select the Anthropic model you want to use for generation. If
                  not provided, the app will use the default model.
                </p>
              </div>

              <button
                onClick={saveSettings}
                className="w-full py-3 px-4 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white transition-all flex items-center justify-center gap-2"
              >
                <FaSave className="w-4 h-4" />
                Save Settings
              </button>

              {saveSuccess && (
                <div className="mt-4 p-3 bg-green-100 border border-green-200 text-green-800 rounded-lg">
                  Settings saved successfully!
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
