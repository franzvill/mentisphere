"use client";
import { useState, useEffect } from "react";

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
  { id: 'anthropic', name: 'Claude (Anthropic)', placeholder: 'sk-ant-...' },
  { id: 'gemini', name: 'Gemini (Google)', placeholder: 'AI...' },
];

export function getLLMConfig(): { provider: string; key: string } | null {
  if (typeof window === 'undefined') return null;
  const provider = localStorage.getItem('ms-llm-provider');
  const key = localStorage.getItem('ms-llm-key');
  if (provider && key) return { provider, key };
  return null;
}

export function setLLMConfig(provider: string, key: string) {
  localStorage.setItem('ms-llm-provider', provider);
  localStorage.setItem('ms-llm-key', key);
}

export function clearLLMConfig() {
  localStorage.removeItem('ms-llm-provider');
  localStorage.removeItem('ms-llm-key');
}

export default function LLMSettings({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [provider, setProvider] = useState('openai');
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const config = getLLMConfig();
    if (config) {
      setProvider(config.provider);
      setKey(config.key);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">LLM Settings</h2>
        <p className="text-sm text-gray-500 mb-4">
          Your API key is stored only in your browser. It is never saved on our servers.
        </p>

        <label className="block text-sm font-medium mb-1">Provider</label>
        <select
          value={provider}
          onChange={e => { setProvider(e.target.value); setSaved(false); }}
          className="w-full border rounded-lg px-3 py-2 mb-4 text-sm"
        >
          {PROVIDERS.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <label className="block text-sm font-medium mb-1">API Key</label>
        <input
          type="password"
          value={key}
          onChange={e => { setKey(e.target.value); setSaved(false); }}
          placeholder={PROVIDERS.find(p => p.id === provider)?.placeholder}
          className="w-full border rounded-lg px-3 py-2 mb-4 text-sm"
        />

        <div className="flex gap-2">
          <button
            onClick={() => {
              setLLMConfig(provider, key);
              setSaved(true);
              setTimeout(onClose, 800);
            }}
            className="flex-1 bg-[#1a237e] text-white rounded-lg py-2 text-sm font-medium"
          >
            {saved ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={() => {
              clearLLMConfig();
              setKey('');
              setSaved(false);
            }}
            className="px-4 border rounded-lg py-2 text-sm text-gray-500"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
