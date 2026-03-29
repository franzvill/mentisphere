import { renderMarkdown } from '../lib/markdown';
import { rateMessage } from '../lib/api';
import type { ChatMessage as MessageType } from '../types';
import { useState } from 'react';

interface Props {
  message: MessageType;
}

export function ChatMessage({ message }: Props) {
  const [currentRating, setCurrentRating] = useState(message.rating);

  const handleRate = async (rating: 'helpful' | 'not_helpful') => {
    await rateMessage(message.id, rating);
    setCurrentRating(rating);
  };

  return (
    <div className={`ms-message ms-message-${message.role}`}>
      <div
        className="ms-message-content"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
      />
      {message.role === 'assistant' && message.content && (
        <div className="ms-message-actions">
          <button onClick={() => handleRate('helpful')} className={currentRating === 'helpful' ? 'active' : ''} title="Helpful">&#x1F44D;</button>
          <button onClick={() => handleRate('not_helpful')} className={currentRating === 'not_helpful' ? 'active' : ''} title="Not helpful">&#x1F44E;</button>
        </div>
      )}
    </div>
  );
}
