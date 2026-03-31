import { GoogleGenAI } from '@google/genai';
import type { LLMProvider, LLMMessage, LLMStreamEvent } from './types';

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
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

    const response = await this.client.models.generateContentStream({
      model: 'gemini-2.0-flash',
      config: { systemInstruction: system },
      contents: params.messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    });

    for await (const chunk of response) {
      const text = chunk.text;
      if (text) {
        yield { type: 'text', text };
      }
    }

    yield { type: 'done' };
  }
}
