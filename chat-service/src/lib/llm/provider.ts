import type { LLMProvider } from './types';
import { AnthropicProvider } from './anthropic';

let provider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (!provider) {
    provider = new AnthropicProvider();
  }
  return provider;
}
