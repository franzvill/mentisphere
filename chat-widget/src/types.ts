export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  rating?: 'helpful' | 'not_helpful' | null;
  createdAt: string;
}

export interface ChatSession {
  session_id: string;
  agent_name: string;
}

export interface StreamEvent {
  type: 'text' | 'done' | 'error';
  text?: string;
  message_id?: string;
  error?: string;
}
