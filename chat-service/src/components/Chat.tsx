"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar, { type Conversation } from "./Sidebar";
import MessageList, { type Message } from "./MessageList";
import ChatInput from "./ChatInput";
import EmptyState from "./EmptyState";
import AgentSearch from "./AgentSearch";
import LLMSettings, { getLLMConfig } from "./LLMSettings";
import BrainPanel from "./pulse/BrainPanel";

export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [manualAgent, setManualAgent] = useState<string | null>(null);
  const [agentSearchOpen, setAgentSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [llmSettingsOpen, setLlmSettingsOpen] = useState(false);
  const [llmSettingsReason, setLlmSettingsReason] = useState<string | null>(
    null
  );

  // Value injected from EmptyState suggestion
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>(
    undefined
  );

  // Message queued while waiting for the user to configure their LLM key
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);

  // True when the wiki session is missing/expired — render sign-in prompt instead of chat UI.
  const [isUnauthed, setIsUnauthed] = useState(false);

  // Brain visualization state — driven by the activation SSE events from /api/chat.
  // The BrainPanel itself fetches the layout and ambient activity stream when open.
  const [activated, setActivated] = useState<{
    agents: Set<string>;
    knowledge: Set<string>;
    selected: string | null;
  }>({ agents: new Set(), knowledge: new Set(), selected: null });

  // Traveling-dot phase: animates 0→1 looped at ~0.33Hz while a chat is in flight,
  // so active edges in the brain panel show "thought" moving through the graph.
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!isStreaming) { setPhase(0); return; }
    const start = Date.now();
    const id = setInterval(() => setPhase(((Date.now() - start) / 3000) % 1), 33);
    return () => clearInterval(id);
  }, [isStreaming]);

  const searchParams = useSearchParams();

  // Fetch conversation list on mount + auto-send ?q= param
  useEffect(() => {
    fetchConversations();
    const initialQuery = searchParams.get("q");
    if (initialQuery) {
      // Auto-send the query from homepage
      setTimeout(() => handleSend(initialQuery), 500);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchConversations() {
    try {
      const res = await fetch("/api/conversations", {
        credentials: "include",
      });
      if (res.status === 401) {
        setIsUnauthed(true);
        return;
      }
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
    setManualAgent(null);
  }, []);

  // Send a message
  const handleSend = useCallback(
    async (text: string) => {
      if (isStreaming) return;

      const llmConfig = getLLMConfig();
      if (!llmConfig) {
        // No key configured — queue the message and prompt the user to configure.
        setQueuedMessage(text);
        setLlmSettingsReason(
          "Add an API key to start chatting. It's stored only in this browser — never on our servers."
        );
        setLlmSettingsOpen(true);
        return;
      }

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
      // Reset brain activation for the new question.
      setActivated({ agents: new Set(), knowledge: new Set(), selected: null });

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-LLM-Provider": llmConfig.provider,
          "X-LLM-Key": llmConfig.key,
        };
        if (llmConfig.model) headers["X-LLM-Model"] = llmConfig.model;

        const res = await fetch("/api/chat", {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({
            conversationId: activeConversationId || undefined,
            message: text,
            agent: manualAgent || undefined,
          }),
        });

        if (res.status === 401) {
          setIsUnauthed(true);
          setIsStreaming(false);
          return;
        }
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
                case "thinking":
                  // Brain panel listens via the `activated` state; nothing else to do here.
                  break;

                case "activated":
                  if (event.kind === "agent" && Array.isArray(event.pageTitles)) {
                    setActivated((a) => ({
                      ...a,
                      agents: new Set([...a.agents, ...event.pageTitles]),
                    }));
                  } else if (event.kind === "knowledge" && Array.isArray(event.pageTitles)) {
                    setActivated((a) => ({
                      ...a,
                      knowledge: new Set([...a.knowledge, ...event.pageTitles]),
                    }));
                  }
                  break;

                case "selected":
                  setActivated((a) => ({ ...a, selected: event.pageTitle }));
                  break;

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
                  // Hold the lit state briefly, then fade — matches /pulse choreography.
                  setTimeout(() => {
                    setActivated({ agents: new Set(), knowledge: new Set(), selected: null });
                  }, 6000);
                  break;

                case "error":
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.role === "assistant") {
                      last.content =
                        event.error || "Something went wrong. Please try again.";
                    }
                    return updated;
                  });
                  // Re-prompt for a key if the server says it's missing.
                  if (
                    typeof event.error === "string" &&
                    /api key|llm settings/i.test(event.error)
                  ) {
                    setQueuedMessage(text);
                    setLlmSettingsReason(
                      "Add an API key to start chatting. It's stored only in this browser — never on our servers."
                    );
                    setLlmSettingsOpen(true);
                  }
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
    [isStreaming, activeConversationId, manualAgent]
  );

  const handlePromptClick = useCallback((prompt: string) => {
    setPendingPrompt(prompt);
  }, []);

  const showEmptyState = messages.length === 0 && !isStreaming;

  if (isUnauthed) {
    return <SignInPrompt />;
  }

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
        onOpenLLMSettings={() => setLlmSettingsOpen(true)}
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
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-[#1a237e]">
                {selectedAgent ? selectedAgent.replace('Agent:', '').replace(/_/g, ' ') : 'MentiSphere'}
              </span>
              {selectedAgent && (
                <button
                  onClick={() => setAgentSearchOpen(true)}
                  className="text-xs text-gray-400 hover:text-[#1a237e] transition-colors"
                >
                  Switch
                </button>
              )}
              {!selectedAgent && messages.length === 0 && (
                <button
                  onClick={() => setAgentSearchOpen(true)}
                  className="text-xs text-gray-400 hover:text-[#1a237e] transition-colors"
                >
                  Browse agents
                </button>
              )}
            </div>
            <button
              onClick={() => setLlmSettingsOpen(true)}
              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-[#1a237e]"
              aria-label="LLM settings"
              title="LLM settings"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 1.5l1.3 2.2a1 1 0 00.9.5h2.5l-1.3 2.2a1 1 0 000 1l1.3 2.2h-2.5a1 1 0 00-.9.5L10 12.3l-1.3-2.2a1 1 0 00-.9-.5H5.3l1.3-2.2a1 1 0 000-1L5.3 4.2h2.5a1 1 0 00.9-.5L10 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
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

      {/* Right-side brain panel — see what the mind activates while it answers */}
      <BrainPanel activated={activated} travelingDotPhase={phase} />

      {/* Agent search modal */}
      <AgentSearch
        currentAgent={selectedAgent}
        onSelectAgent={(agent) => {
          setSelectedAgent(agent);
          setManualAgent(agent);
        }}
        isOpen={agentSearchOpen}
        onClose={() => setAgentSearchOpen(false)}
      />

      {/* LLM settings modal */}
      <LLMSettings
        isOpen={llmSettingsOpen}
        reason={llmSettingsReason}
        onClose={() => {
          setLlmSettingsOpen(false);
          setLlmSettingsReason(null);
          // If the user queued a message and now has a key, fire it.
          if (queuedMessage) {
            const config = getLLMConfig();
            if (config) {
              const msg = queuedMessage;
              setQueuedMessage(null);
              handleSend(msg);
            } else {
              // User dismissed without saving — drop it back into the input
              // so they don't lose what they typed.
              setPendingPrompt(queuedMessage);
              setQueuedMessage(null);
            }
          }
        }}
      />
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="flex h-full items-center justify-center bg-white px-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold text-[#1a237e]">
          Sign in to chat
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          MentiSphere chats are tied to a wiki account so your conversations
          are saved and you can contribute back to agents you use.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <a
            href="/wiki/Special:UserLogin?returnto=Main_Page"
            className="rounded-lg bg-[#1a237e] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#283593]"
          >
            Log in
          </a>
          <a
            href="/wiki/Special:CreateAccount?returnto=Main_Page"
            className="rounded-lg border border-[#1a237e] px-5 py-2.5 text-sm font-medium text-[#1a237e] transition hover:bg-[#1a237e]/5"
          >
            Create account
          </a>
        </div>
        <p className="mt-6 text-xs text-gray-400">
          Account creation is free.
        </p>
      </div>
    </div>
  );
}
