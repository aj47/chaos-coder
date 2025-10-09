import { validateOpenAIConfig, getProvider, AI_PROVIDERS } from '../ai-config';

describe('AI Configuration', () => {
  describe('validateOpenAIConfig', () => {
    it('should return no errors for valid config', () => {
      const config = {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test123',
        model: 'gpt-4',
      };
      
      const errors = validateOpenAIConfig(config);
      expect(errors).toHaveLength(0);
    });

    it('should return error for missing baseUrl', () => {
      const config = {
        apiKey: 'sk-test123',
        model: 'gpt-4',
      };
      
      const errors = validateOpenAIConfig(config);
      expect(errors).toContain('Base URL is required');
    });

    it('should return error for invalid baseUrl', () => {
      const config = {
        baseUrl: 'invalid-url',
        apiKey: 'sk-test123',
        model: 'gpt-4',
      };
      
      const errors = validateOpenAIConfig(config);
      expect(errors).toContain('Invalid base URL format');
    });

    it('should return error for missing model', () => {
      const config = {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test123',
      };
      
      const errors = validateOpenAIConfig(config);
      expect(errors).toContain('Model is required');
    });
  });

  describe('getProvider', () => {
    it('should return provider by id', () => {
      const provider = getProvider('openai');
      expect(provider).toBeDefined();
      expect(provider?.name).toBe('OpenAI');
    });

    it('should return undefined for unknown provider', () => {
      const provider = getProvider('unknown');
      expect(provider).toBeUndefined();
    });
  });

  describe('AI_PROVIDERS', () => {
    it('should contain default providers', () => {
      expect(AI_PROVIDERS.length).toBeGreaterThan(0);
      
      const providerIds = AI_PROVIDERS.map(p => p.id);
      expect(providerIds).toContain('portkey');
      expect(providerIds).toContain('openai');
      expect(providerIds).toContain('groq');
    });

    it('should have valid provider configurations', () => {
      AI_PROVIDERS.forEach(provider => {
        expect(provider.id).toBeTruthy();
        expect(provider.name).toBeTruthy();
        expect(provider.type).toMatch(/^(portkey|openai-compatible)$/);
        expect(provider.models).toBeInstanceOf(Array);
        expect(provider.models.length).toBeGreaterThan(0);
        expect(provider.defaultModel).toBeTruthy();
        expect(provider.description).toBeTruthy();
        expect(typeof provider.requiresApiKey).toBe('boolean');
      });
    });
  });
});
