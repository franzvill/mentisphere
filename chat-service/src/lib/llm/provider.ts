import type { LLMProvider } from './types';
import { OpenAIProvider } from './openai';

let provider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (!provider) {
    provider = new OpenAIProvider();
  }
  return provider;
}
