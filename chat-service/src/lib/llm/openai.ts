import OpenAI from 'openai';
import type { LLMProvider, LLMMessage, LLMStreamEvent } from './types';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.client = new OpenAI(apiKey ? { apiKey } : undefined);
    this.model = model || 'gpt-5.4';
  }

  async *stream(params: {
    systemPrompt: string;
    messages: LLMMessage[];
    skillInstructions?: string;
    knowledgeContext?: string;
  }): AsyncIterable<LLMStreamEvent> {
    let system = params.systemPrompt;
    if (params.skillInstructions) {
      system += '\n\n---\nSkill Instructions:\n' + params.skillInstructions;
    }
    if (params.knowledgeContext) {
      system += '\n\n---\nRelevant Knowledge:\n' + params.knowledgeContext;
    }

    const stream = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 4096,
      stream: true,
      messages: [
        { role: 'system', content: system },
        ...params.messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield { type: 'text', text: delta };
      }
    }

    yield { type: 'done' };
  }
}
