import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, LLMMessage, LLMStreamEvent } from './types';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async *stream(params: {
    systemPrompt: string;
    messages: LLMMessage[];
    knowledgeContext?: string;
  }): AsyncIterable<LLMStreamEvent> {
    let system = params.systemPrompt;
    if (params.knowledgeContext) {
      system += '\n\n---\nRelevant Knowledge:\n' + params.knowledgeContext;
    }

    const stream = this.client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system,
      messages: params.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { type: 'text', text: event.delta.text };
      }
    }

    yield { type: 'done' };
  }
}
