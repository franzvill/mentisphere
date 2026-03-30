"use client";

import { useEffect, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import AgentBadge from "./AgentBadge";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentPageTitle?: string | null;
  createdAt?: string;
}

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
}

function renderMarkdown(text: string): string {
  const raw = marked.parse(text, { async: false }) as string;
  return DOMPurify.sanitize(raw);
}

function StreamingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
    </span>
  );
}

export default function MessageList({ messages, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages or while streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          const isLastAssistant =
            !isUser && i === messages.length - 1;
          const showDots =
            isLastAssistant && isStreaming && !msg.content;

          // Show agent badge if this assistant message has an agent,
          // and it differs from the previous assistant message's agent
          let showBadge = false;
          if (!isUser && msg.agentPageTitle) {
            const prevAssistant = messages
              .slice(0, i)
              .reverse()
              .find((m) => m.role === "assistant");
            showBadge =
              !prevAssistant ||
              prevAssistant.agentPageTitle !== msg.agentPageTitle;
          }

          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] ${
                  isUser ? "" : "w-full max-w-[85%]"
                }`}
              >
                {showBadge && msg.agentPageTitle && (
                  <AgentBadge agent={msg.agentPageTitle} />
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isUser
                      ? "bg-blue-50 text-gray-800"
                      : "bg-gray-50 text-gray-800"
                  }`}
                >
                  {showDots ? (
                    <StreamingDots />
                  ) : isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div
                      className="prose prose-sm max-w-none prose-p:my-1.5 prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-code:text-[#1a237e]"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(msg.content),
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
