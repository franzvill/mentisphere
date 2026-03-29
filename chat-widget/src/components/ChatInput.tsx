import { useState, type FormEvent } from 'react';

interface Props {
  onSend: (content: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  return (
    <form className="ms-chat-input" onSubmit={handleSubmit}>
      <input type="text" value={value} onChange={e => setValue(e.target.value)} placeholder="Type a message..." disabled={disabled} />
      <button type="submit" disabled={disabled || !value.trim()}>Send</button>
    </form>
  );
}
