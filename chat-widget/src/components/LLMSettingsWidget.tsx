import { useState, useEffect } from 'react';

const PROVIDERS = [
  {
    id: 'openai', name: 'OpenAI', placeholder: 'sk-...',
    models: [
      { id: 'gpt-5.4', name: 'GPT-5.4' },
      { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' },
      { id: 'gpt-5.4-nano', name: 'GPT-5.4 Nano' },
      { id: 'gpt-4o', name: 'GPT-4o' },
    ],
  },
  {
    id: 'anthropic', name: 'Claude', placeholder: 'sk-ant-...',
    models: [
      { id: 'claude-opus-4-6', name: 'Opus 4.6' },
      { id: 'claude-sonnet-4-6', name: 'Sonnet 4.6' },
      { id: 'claude-haiku-4-5-20251001', name: 'Haiku 4.5' },
    ],
  },
  {
    id: 'gemini', name: 'Gemini', placeholder: 'AI...',
    models: [
      { id: 'gemini-3.1-pro', name: '3.1 Pro' },
      { id: 'gemini-3-flash', name: '3 Flash' },
      { id: 'gemini-3.1-flash-lite', name: '3.1 Flash-Lite' },
    ],
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function LLMSettingsWidget({ isOpen, onClose }: Props) {
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-5.4');
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const p = localStorage.getItem('ms-llm-provider');
      const k = localStorage.getItem('ms-llm-key');
      const m = localStorage.getItem('ms-llm-model');
      if (p) setProvider(p);
      if (k) setKey(k);
      if (m) setModel(m);
    } catch {}
    setSaved(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentProvider = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0];

  return (
    <div className="ms-settings-overlay" onClick={onClose}>
      <div className="ms-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="ms-settings-title">LLM Settings</div>
        <div className="ms-settings-note">Your API key is stored only in your browser.</div>

        <label className="ms-settings-label">Provider</label>
        <select
          value={provider}
          onChange={e => {
            setProvider(e.target.value);
            const p = PROVIDERS.find(p => p.id === e.target.value);
            setModel(p?.models[0]?.id || '');
            setSaved(false);
          }}
          className="ms-settings-select"
        >
          {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <label className="ms-settings-label">Model</label>
        <select
          value={model}
          onChange={e => { setModel(e.target.value); setSaved(false); }}
          className="ms-settings-select"
        >
          {currentProvider.models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <label className="ms-settings-label">API Key</label>
        <input
          type="password"
          value={key}
          onChange={e => { setKey(e.target.value); setSaved(false); }}
          placeholder={currentProvider.placeholder}
          className="ms-settings-input"
        />

        <div className="ms-settings-actions">
          <button
            className="ms-settings-save"
            onClick={() => {
              try {
                localStorage.setItem('ms-llm-provider', provider);
                localStorage.setItem('ms-llm-model', model);
                localStorage.setItem('ms-llm-key', key);
              } catch {}
              setSaved(true);
              setTimeout(onClose, 600);
            }}
          >
            {saved ? 'Saved!' : 'Save'}
          </button>
          <button
            className="ms-settings-clear"
            onClick={() => {
              try {
                localStorage.removeItem('ms-llm-provider');
                localStorage.removeItem('ms-llm-model');
                localStorage.removeItem('ms-llm-key');
              } catch {}
              setKey('');
              setSaved(false);
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
