"use client";
import { useState, useEffect } from "react";

const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    placeholder: 'sk-...',
    models: [
      { id: 'gpt-5.4', name: 'GPT-5.4 (Flagship)' },
      { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini (Fast)' },
      { id: 'gpt-5.4-nano', name: 'GPT-5.4 Nano (Cheapest)' },
      { id: 'gpt-4o', name: 'GPT-4o (Previous gen)' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Claude (Anthropic)',
    placeholder: 'sk-ant-...',
    models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6 (Most capable)' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6 (Best value)' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5 (Fast)' },
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini (Google)',
    placeholder: 'AI...',
    models: [
      { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro (Most capable)' },
      { id: 'gemini-3-flash', name: 'Gemini 3 Flash (Fast)' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite (Cheapest)' },
    ],
  },
];

export function getLLMConfig(): { provider: string; key: string; model: string } | null {
  if (typeof window === 'undefined') return null;
  const provider = localStorage.getItem('ms-llm-provider');
  const key = localStorage.getItem('ms-llm-key');
  const model = localStorage.getItem('ms-llm-model');
  if (provider && key) return { provider, key, model: model || '' };
  return null;
}

export function setLLMConfig(provider: string, key: string, model: string) {
  localStorage.setItem('ms-llm-provider', provider);
  localStorage.setItem('ms-llm-key', key);
  localStorage.setItem('ms-llm-model', model);
}

export function clearLLMConfig() {
  localStorage.removeItem('ms-llm-provider');
  localStorage.removeItem('ms-llm-key');
  localStorage.removeItem('ms-llm-model');
}

export default function LLMSettings({
  isOpen,
  onClose,
  reason,
}: {
  isOpen: boolean;
  onClose: () => void;
  reason?: string | null;
}) {
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-5.4');
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);

  const currentProviderData = PROVIDERS.find(p => p.id === provider) ?? PROVIDERS[0];

  useEffect(() => {
    const config = getLLMConfig();
    if (config) {
      setProvider(config.provider);
      setKey(config.key);
      if (config.model) {
        setModel(config.model);
      } else {
        // Default to first model of saved provider
        const providerData = PROVIDERS.find(p => p.id === config.provider);
        if (providerData) setModel(providerData.models[0].id);
      }
    }
  }, [isOpen]);

  function handleProviderChange(newProvider: string) {
    setProvider(newProvider);
    // Reset model to first option of the new provider
    const providerData = PROVIDERS.find(p => p.id === newProvider);
    if (providerData) setModel(providerData.models[0].id);
    setSaved(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-2">LLM Settings</h2>
        {reason ? (
          <div className="mb-4 rounded-lg border border-[#1a237e]/20 bg-[#f5f5ff] px-3 py-2 text-sm text-[#1a237e]">
            {reason}
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-4">
            Your API key is stored only in your browser. It is never saved on our servers.
          </p>
        )}

        <label className="block text-sm font-medium mb-1">Provider</label>
        <select
          value={provider}
          onChange={e => handleProviderChange(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mb-4 text-sm"
        >
          {PROVIDERS.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <label className="block text-sm font-medium mb-1">Model</label>
        <select
          value={model}
          onChange={e => { setModel(e.target.value); setSaved(false); }}
          className="w-full border rounded-lg px-3 py-2 mb-4 text-sm"
        >
          {currentProviderData.models.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <label className="block text-sm font-medium mb-1">API Key</label>
        <input
          type="password"
          value={key}
          onChange={e => { setKey(e.target.value); setSaved(false); }}
          placeholder={currentProviderData.placeholder}
          className="w-full border rounded-lg px-3 py-2 mb-4 text-sm"
        />

        <div className="flex gap-2">
          <button
            onClick={() => {
              setLLMConfig(provider, key, model);
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
