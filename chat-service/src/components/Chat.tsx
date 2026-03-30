"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar, { type Conversation } from "./Sidebar";
import MessageList, { type Message } from "./MessageList";
import ChatInput from "./ChatInput";
import EmptyState from "./EmptyState";

export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Value injected from EmptyState suggestion
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>(
    undefined
  );

  // Fetch conversation list on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  async function fetchConversations() {
    try {
      const res = await fetch("/api/conversations", {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch {
      // ignore network errors silently
    }
  }

  // Load messages for a conversation
  const loadConversation = useCallback(async (id: string) => {
    setActiveConversationId(id);
    setMessages([]);
    setSelectedAgent(null);
    try {
      const res = await fetch(`/api/conversations/${id}/messages`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
      // Determine the latest agent from the messages
      const lastAssistant = [...(data.messages ?? [])]
        .reverse()
        .find((m: Message) => m.role === "assistant");
      if (lastAssistant?.agentPageTitle) {
        setSelectedAgent(lastAssistant.agentPageTitle);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setSelectedAgent(null);
  }, []);

  // Send a message
  const handleSend = useCallback(
    async (text: string) => {
      if (isStreaming) return;

      const userMsg: Message = {
        id: `tmp-user-${Date.now()}`,
        role: "user",
        content: text,
      };

      const assistantMsg: Message = {
        id: `tmp-assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        agentPageTitle: null,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            conversationId: activeConversationId || undefined,
            message: text,
          }),
        });

        if (!res.ok || !res.body) {
          setIsStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const jsonStr = trimmed.slice(6);

            try {
              const event = JSON.parse(jsonStr);

              switch (event.type) {
                case "agent_selected":
                  setSelectedAgent(event.agent);
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.role === "assistant") {
                      last.agentPageTitle = event.agent;
                    }
                    return updated;
                  });
                  break;

                case "conversation":
                  setActiveConversationId(event.conversationId);
                  // Refresh the sidebar to include the new conversation
                  fetchConversations();
                  break;

                case "text":
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.role === "assistant") {
                      last.content += event.text;
                    }
                    return updated;
                  });
                  break;

                case "done":
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.role === "assistant" && event.message_id) {
                      last.id = event.message_id;
                    }
                    return updated;
                  });
                  break;
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      } catch {
        // network error
      } finally {
        setIsStreaming(false);
        fetchConversations();
      }
    },
    [isStreaming, activeConversationId]
  );

  const handlePromptClick = useCallback((prompt: string) => {
    setPendingPrompt(prompt);
  }, []);

  const showEmptyState = messages.length === 0 && !isStreaming;

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        onSelect={loadConversation}
        onNewChat={handleNewChat}
      />

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-12 shrink-0 items-center border-b border-gray-200 bg-white px-4">
          {/* Hamburger (visible when sidebar is collapsed or on mobile) */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className={`mr-3 rounded-lg p-1.5 transition hover:bg-gray-100 ${
              sidebarOpen ? "md:hidden" : ""
            }`}
            aria-label="Toggle sidebar"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 5H17M3 10H17M3 15H17"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <h2 className="truncate text-sm font-medium text-gray-700">
            {selectedAgent ? selectedAgent : "MentiSphere"}
          </h2>
        </header>

        {/* Messages or empty state */}
        {showEmptyState ? (
          <EmptyState onPromptClick={handlePromptClick} />
        ) : (
          <MessageList messages={messages} isStreaming={isStreaming} />
        )}

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          externalValue={pendingPrompt}
          onExternalValueConsumed={() => setPendingPrompt(undefined)}
        />
      </div>
    </div>
  );
}
