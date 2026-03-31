export type LLMProviderType = 'openai' | 'anthropic' | 'gemini';

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMStreamEvent {
  type: 'text' | 'done' | 'error';
  text?: string;
  error?: string;
}

export interface LLMProvider {
  stream(params: {
    systemPrompt: string;
    messages: LLMMessage[];
    skillInstructions?: string;
    knowledgeContext?: string;
  }): AsyncIterable<LLMStreamEvent>;
}
