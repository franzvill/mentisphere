import type { LLMProvider } from './types';
import type { LLMProviderType } from './types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';

export class NoKeyError extends Error {
  constructor() {
    super('No API key configured. Please set your LLM API key in Settings.');
    this.name = 'NoKeyError';
  }
}

/**
 * Get an LLM provider for chat responses.
 * Requires user-provided key — server key is reserved for embeddings/routing only.
 */
export function getLLMProvider(providerType?: LLMProviderType, apiKey?: string, model?: string): LLMProvider {
  if (!apiKey || !providerType) {
    throw new NoKeyError();
  }

  switch (providerType) {
    case 'openai': return new OpenAIProvider(apiKey, model);
    case 'anthropic': return new AnthropicProvider(apiKey, model);
    case 'gemini': return new GeminiProvider(apiKey, model);
  }
}

/**
 * Get an LLM provider for internal use (routing, embeddings).
 * Uses the server's OPENAI_API_KEY from env — never for user-facing chat.
 */
let internalProvider: LLMProvider | null = null;

export function getInternalLLMProvider(model?: string): LLMProvider {
  if (!internalProvider) {
    internalProvider = new OpenAIProvider(undefined, model);
  }
  return internalProvider;
}
