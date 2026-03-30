"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  /** Set externally (e.g. from EmptyState suggestion) */
  externalValue?: string;
  onExternalValueConsumed?: () => void;
}

export default function ChatInput({
  onSend,
  disabled,
  externalValue,
  onExternalValueConsumed,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const resize = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
    }
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  // Handle externally-set value (from suggestion cards)
  useEffect(() => {
    if (externalValue) {
      setValue(externalValue);
      onExternalValueConsumed?.();
      // Focus the textarea
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [externalValue, onExternalValueConsumed]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-2 shadow-sm transition focus-within:border-[#1a237e] focus-within:shadow-md">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message MentiSphere..."
          disabled={disabled}
          rows={1}
          className="max-h-[200px] flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a237e] text-white transition hover:bg-[#0d1557] disabled:opacity-40 disabled:hover:bg-[#1a237e]"
          aria-label="Send message"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 13V9L8 8L3 7V3L14 8L3 13Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
      <p className="mt-1.5 text-center text-[11px] text-gray-400">
        MentiSphere may produce inaccurate information. Verify important details.
      </p>
    </div>
  );
}
