"use client";

import { useState, useEffect, useRef } from "react";

interface Agent {
  pageTitle: string;
  name: string;
  description: string;
  similarity?: number;
}

interface AgentSearchProps {
  currentAgent: string | null;
  onSelectAgent: (pageTitle: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function AgentSearch({ currentAgent, onSelectAgent, isOpen, onClose }: AgentSearchProps) {
  const [query, setQuery] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      // Load initial agents
      fetchAgents("");
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) fetchAgents(query);
    }, 300); // debounce
    return () => clearTimeout(timer);
  }, [query]);

  async function fetchAgents(q: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/search?q=${encodeURIComponent(q)}&limit=10`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents);
      }
    } catch (e) {
      console.error("Agent search failed:", e);
    }
    setLoading(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search agents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1a237e] text-sm"
          />
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-gray-400 text-sm">Searching...</div>
          )}
          {!loading && agents.length === 0 && (
            <div className="p-4 text-center text-gray-400 text-sm">No agents found</div>
          )}
          {!loading && agents.map((agent) => (
            <button
              key={agent.pageTitle}
              onClick={() => {
                onSelectAgent(agent.pageTitle);
                onClose();
              }}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                agent.pageTitle === currentAgent ? "bg-blue-50" : ""
              }`}
            >
              <div className="font-medium text-sm text-gray-900">{agent.name}</div>
              <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{agent.description}</div>
              {agent.similarity && (
                <div className="text-xs text-[#00897b] mt-0.5">{Math.round(agent.similarity * 100)}% match</div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
