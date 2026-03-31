import { Annotation } from '@langchain/langgraph';

export const ChatGraphState = Annotation.Root({
  userMessage: Annotation<string>,
  conversationHistory: Annotation<Array<{ role: string; content: string }>>,
  selectedAgent: Annotation<string | null>({ reducer: (_, b) => b, default: () => null }),
  systemPrompt: Annotation<string | null>({ reducer: (_, b) => b, default: () => null }),
  knowledgeContext: Annotation<string | null>({ reducer: (_, b) => b, default: () => null }),
  skillInstructions: Annotation<string | null>({ reducer: (_, b) => b, default: () => null }),
  response: Annotation<string>({ reducer: (_, b) => b, default: () => '' }),
  skillCatalog: Annotation<string>({ reducer: (_, b) => b, default: () => '' }),
  llmProvider: Annotation<string | null>({ reducer: (_, b) => b, default: () => null }),
  llmKey: Annotation<string | null>({ reducer: (_, b) => b, default: () => null }),
  llmModel: Annotation<string | null>({ reducer: (_, b) => b, default: () => null }),
});
