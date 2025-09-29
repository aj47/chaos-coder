"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { useAIConfig } from "@/hooks/useAIConfig";
import { AIProvider } from "@/lib/ai-config";
import { FaTimes, FaPlus, FaTrash, FaCheck, FaExclamationTriangle } from "react-icons/fa";

interface AIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIConfigModal({ isOpen, onClose }: AIConfigModalProps) {
  const { theme } = useTheme();
  const {
    currentProvider,
    currentConfig,
    availableProviders,
    isConfigValid,
    setProvider,
    updateConfig,
    addCustomProvider,
    removeCustomProvider,
    resetToDefaults,
    validateConfig,
  } = useAIConfig();

  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProvider, setNewProvider] = useState<Partial<AIProvider>>({
    id: '',
    name: '',
    type: 'openai-compatible',
    baseUrl: '',
    models: [''],
    defaultModel: '',
    description: '',
    requiresApiKey: true,
  });

  const errors = validateConfig();

  const handleProviderChange = (providerId: string) => {
    setProvider(providerId);
  };

  const handleConfigChange = (field: string, value: string | number) => {
    updateConfig({ [field]: value });
  };

  const handleAddProvider = () => {
    if (newProvider.id && newProvider.name && newProvider.baseUrl) {
      addCustomProvider({
        ...newProvider,
        models: newProvider.models?.filter(m => m.trim()) || [''],
        defaultModel: newProvider.defaultModel || newProvider.models?.[0] || '',
      } as AIProvider);
      
      setNewProvider({
        id: '',
        name: '',
        type: 'openai-compatible',
        baseUrl: '',
        models: [''],
        defaultModel: '',
        description: '',
        requiresApiKey: true,
      });
      setShowAddProvider(false);
    }
  };

  const handleModelChange = (index: number, value: string) => {
    const newModels = [...(newProvider.models || [''])];
    newModels[index] = value;
    setNewProvider({ ...newProvider, models: newModels });
  };

  const addModelField = () => {
    setNewProvider({
      ...newProvider,
      models: [...(newProvider.models || ['']), ''],
    });
  };

  const removeModelField = (index: number) => {
    const newModels = [...(newProvider.models || [''])];
    newModels.splice(index, 1);
    setNewProvider({ ...newProvider, models: newModels });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl shadow-2xl ${
            theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`sticky top-0 p-6 border-b ${
            theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">AI Configuration</h2>
              <button
                onClick={onClose}
                className={`p-2 rounded-full ${
                  theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-6">
            {/* Current Status */}
            <div className={`p-4 rounded-lg ${
              isConfigValid 
                ? theme === 'dark' ? 'bg-green-900/20 border border-green-700' : 'bg-green-50 border border-green-200'
                : theme === 'dark' ? 'bg-red-900/20 border border-red-700' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {isConfigValid ? (
                  <FaCheck className="w-4 h-4 text-green-500" />
                ) : (
                  <FaExclamationTriangle className="w-4 h-4 text-red-500" />
                )}
                <span className="font-medium">
                  {isConfigValid ? 'Configuration Valid' : 'Configuration Issues'}
                </span>
              </div>
              {!isConfigValid && (
                <ul className="text-sm space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="text-red-600 dark:text-red-400">• {error}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">AI Provider</label>
              <select
                value={currentProvider.id}
                onChange={(e) => handleProviderChange(e.target.value)}
                className={`w-full p-3 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              >
                {availableProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} {provider.type === 'portkey' ? '(Multi-Provider)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">{currentProvider.description}</p>
            </div>

            {/* Provider Configuration */}
            {currentProvider.type === 'openai-compatible' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Base URL</label>
                  <input
                    type="url"
                    name="ai-base-url"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    inputMode="url"
                    value={currentConfig.baseUrl}
                    onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                    placeholder="https://api.example.com/v1"
                    className={`w-full p-3 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>

                {currentProvider.requiresApiKey && (
                  <div>
                    <label className="block text-sm font-medium mb-2">API Key</label>
                    <input
                      type="password"
                      name="ai-api-key"
                      autoComplete="new-password"
                      autoCapitalize="none"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      value={currentConfig.apiKey}
                      onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                      placeholder="Enter your API key"
                      className={`w-full p-3 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Model</label>
                  <select
                    value={currentConfig.model}
                    onChange={(e) => handleConfigChange('model', e.target.value)}
                    className={`w-full p-3 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  >
                    {currentProvider.models.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Temperature</label>
                    <input
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={currentConfig.temperature || 0.7}
                      onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
                      className={`w-full p-3 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Max Tokens</label>
                    <input
                      type="number"
                      min="1"
                      max="32000"
                      value={currentConfig.maxTokens || 4096}
                      onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value))}
                      className={`w-full p-3 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowAddProvider(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                  theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <FaPlus className="w-3 h-3" />
                Add Custom Provider
              </button>
              
              <button
                onClick={resetToDefaults}
                className={`px-4 py-2 rounded-lg font-medium ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
