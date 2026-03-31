import type { LLMProvider } from './types';
import type { LLMProviderType } from './types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';

// Default provider (uses server env key)
let defaultProvider: LLMProvider | null = null;

export function getLLMProvider(providerType?: LLMProviderType, apiKey?: string): LLMProvider {
  // If user provides their own key, create a fresh provider
  if (apiKey && providerType) {
    switch (providerType) {
      case 'openai': return new OpenAIProvider(apiKey);
      case 'anthropic': return new AnthropicProvider(apiKey);
      case 'gemini': return new GeminiProvider(apiKey);
    }
  }

  // Fall back to server default (OpenAI from env)
  if (!defaultProvider) {
    defaultProvider = new OpenAIProvider();
  }
  return defaultProvider;
}
