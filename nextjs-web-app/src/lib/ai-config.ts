// AI Service Configuration Management
export interface AIProvider {
  id: string;
  name: string;
  type: 'portkey' | 'openai-compatible';
  baseUrl?: string;
  apiKey?: string;
  models: string[];
  defaultModel: string;
  description: string;
  requiresApiKey: boolean;
}

export interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

// Default AI providers configuration
export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'portkey',
    name: 'Portkey (Multi-Provider)',
    type: 'portkey',
    models: ['qwen-3-32b', 'llama-3.2-1b-preview', 'google/gemini-flash-1.5-8b', 'gpt-4o-mini'],
    defaultModel: 'qwen-3-32b',
    description: 'Multi-provider AI gateway with fallback support',
    requiresApiKey: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o-mini',
    description: 'Official OpenAI API',
    requiresApiKey: true,
  },
  {
    id: 'groq',
    name: 'Groq',
    type: 'openai-compatible',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.2-90b-text-preview', 'llama-3.2-11b-text-preview', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
    defaultModel: 'llama-3.2-11b-text-preview',
    description: 'Fast inference with Groq chips',
    requiresApiKey: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic (via OpenRouter)',
    type: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['anthropic/claude-3.5-sonnet', 'anthropic/claude-3-haiku', 'anthropic/claude-3-opus'],
    defaultModel: 'anthropic/claude-3.5-sonnet',
    description: 'Anthropic Claude models via OpenRouter',
    requiresApiKey: true,
  },
  {
    id: 'local-ollama',
    name: 'Local Ollama',
    type: 'openai-compatible',
    baseUrl: 'http://localhost:11434/v1',
    models: ['llama3.2', 'codellama', 'mistral', 'qwen2.5'],
    defaultModel: 'llama3.2',
    description: 'Local Ollama instance',
    requiresApiKey: false,
  },
  {
    id: 'custom',
    name: 'Custom OpenAI Compatible',
    type: 'openai-compatible',
    baseUrl: '',
    models: ['custom-model'],
    defaultModel: 'custom-model',
    description: 'Custom OpenAI compatible endpoint',
    requiresApiKey: true,
  },
];

// Get provider by ID
export function getProvider(id: string): AIProvider | undefined {
  return AI_PROVIDERS.find(provider => provider.id === id);
}

// Validate OpenAI compatible configuration
export function validateOpenAIConfig(config: Partial<OpenAICompatibleConfig>): string[] {
  const errors: string[] = [];
  
  if (!config.baseUrl) {
    errors.push('Base URL is required');
  } else if (!isValidUrl(config.baseUrl)) {
    errors.push('Invalid base URL format');
  }
  
  if (!config.model) {
    errors.push('Model is required');
  }
  
  return errors;
}

// Helper function to validate URL
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Default configuration
export const DEFAULT_AI_CONFIG = {
  provider: 'portkey',
  temperature: 0.7,
  maxTokens: 4096,
};

// Storage keys for configuration
export const STORAGE_KEYS = {
  AI_PROVIDER: 'chaos-coder-ai-provider',
  AI_CONFIG: 'chaos-coder-ai-config',
  CUSTOM_PROVIDERS: 'chaos-coder-custom-providers',
} as const;
