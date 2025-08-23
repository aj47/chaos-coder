import { useState, useEffect, useCallback } from 'react';
import { AIProvider, OpenAICompatibleConfig, AI_PROVIDERS, getProvider, STORAGE_KEYS, DEFAULT_AI_CONFIG } from '@/lib/ai-config';

export interface AIConfigState {
  provider: AIProvider;
  config: OpenAICompatibleConfig;
  customProviders: AIProvider[];
}

export interface UseAIConfigReturn {
  // State
  currentProvider: AIProvider;
  currentConfig: OpenAICompatibleConfig;
  availableProviders: AIProvider[];
  isConfigValid: boolean;
  
  // Actions
  setProvider: (providerId: string) => void;
  updateConfig: (config: Partial<OpenAICompatibleConfig>) => void;
  addCustomProvider: (provider: AIProvider) => void;
  removeCustomProvider: (providerId: string) => void;
  resetToDefaults: () => void;
  
  // Validation
  validateConfig: () => string[];
}

export function useAIConfig(): UseAIConfigReturn {
  const [currentProvider, setCurrentProvider] = useState<AIProvider>(AI_PROVIDERS[0]);
  const [currentConfig, setCurrentConfig] = useState<OpenAICompatibleConfig>({
    baseUrl: '',
    apiKey: '',
    model: '',
    temperature: DEFAULT_AI_CONFIG.temperature,
    maxTokens: DEFAULT_AI_CONFIG.maxTokens,
  });
  const [customProviders, setCustomProviders] = useState<AIProvider[]>([]);

  // Load configuration from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Load provider
        const savedProviderId = localStorage.getItem(STORAGE_KEYS.AI_PROVIDER);
        if (savedProviderId) {
          const provider = getProvider(savedProviderId);
          if (provider) {
            setCurrentProvider(provider);
          }
        }

        // Load config
        const savedConfig = localStorage.getItem(STORAGE_KEYS.AI_CONFIG);
        if (savedConfig) {
          const config = JSON.parse(savedConfig);
          setCurrentConfig(prev => ({ ...prev, ...config }));
        }

        // Load custom providers
        const savedCustomProviders = localStorage.getItem(STORAGE_KEYS.CUSTOM_PROVIDERS);
        if (savedCustomProviders) {
          setCustomProviders(JSON.parse(savedCustomProviders));
        }
      } catch (error) {
        console.error('Error loading AI configuration:', error);
      }
    }
  }, []);

  // Save configuration to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.AI_PROVIDER, currentProvider.id);
    }
  }, [currentProvider]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.AI_CONFIG, JSON.stringify(currentConfig));
    }
  }, [currentConfig]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_PROVIDERS, JSON.stringify(customProviders));
    }
  }, [customProviders]);

  // Get all available providers (built-in + custom)
  const availableProviders = [...AI_PROVIDERS, ...customProviders];

  // Set provider and update config accordingly
  const setProvider = useCallback((providerId: string) => {
    const provider = availableProviders.find(p => p.id === providerId);
    if (provider) {
      setCurrentProvider(provider);
      
      // Update config with provider defaults
      setCurrentConfig(prev => ({
        ...prev,
        baseUrl: provider.baseUrl || prev.baseUrl,
        model: provider.defaultModel,
      }));
    }
  }, [availableProviders]);

  // Update configuration
  const updateConfig = useCallback((config: Partial<OpenAICompatibleConfig>) => {
    setCurrentConfig(prev => ({ ...prev, ...config }));
  }, []);

  // Add custom provider
  const addCustomProvider = useCallback((provider: AIProvider) => {
    setCustomProviders(prev => {
      const existing = prev.find(p => p.id === provider.id);
      if (existing) {
        // Update existing provider
        return prev.map(p => p.id === provider.id ? provider : p);
      } else {
        // Add new provider
        return [...prev, provider];
      }
    });
  }, []);

  // Remove custom provider
  const removeCustomProvider = useCallback((providerId: string) => {
    setCustomProviders(prev => prev.filter(p => p.id !== providerId));
    
    // If the current provider is being removed, switch to default
    if (currentProvider.id === providerId) {
      setProvider(AI_PROVIDERS[0].id);
    }
  }, [currentProvider.id, setProvider]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setCurrentProvider(AI_PROVIDERS[0]);
    setCurrentConfig({
      baseUrl: '',
      apiKey: '',
      model: AI_PROVIDERS[0].defaultModel,
      temperature: DEFAULT_AI_CONFIG.temperature,
      maxTokens: DEFAULT_AI_CONFIG.maxTokens,
    });
    setCustomProviders([]);
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.AI_PROVIDER);
      localStorage.removeItem(STORAGE_KEYS.AI_CONFIG);
      localStorage.removeItem(STORAGE_KEYS.CUSTOM_PROVIDERS);
    }
  }, []);

  // Validate current configuration
  const validateConfig = useCallback((): string[] => {
    const errors: string[] = [];

    if (currentProvider.type === 'openai-compatible') {
      if (!currentConfig.baseUrl) {
        errors.push('Base URL is required');
      }

      if (currentProvider.requiresApiKey && !currentConfig.apiKey) {
        errors.push('API key is required');
      }

      if (!currentConfig.model) {
        errors.push('Model is required');
      }
    }

    return errors;
  }, [currentProvider, currentConfig]);

  const isConfigValid = validateConfig().length === 0;

  return {
    // State
    currentProvider,
    currentConfig,
    availableProviders,
    isConfigValid,
    
    // Actions
    setProvider,
    updateConfig,
    addCustomProvider,
    removeCustomProvider,
    resetToDefaults,
    
    // Validation
    validateConfig,
  };
}
