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
    knowledgeContext?: string;
  }): AsyncIterable<LLMStreamEvent>;
}
