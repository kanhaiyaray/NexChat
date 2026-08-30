import { useState } from 'react';

const PinnedMessages = ({ pinnedMessages, onJumpToMessage }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!pinnedMessages || pinnedMessages.length === 0) {
    return (
      <div className="pins-section">
        <div className="pins-header" onClick={() => setIsOpen(!isOpen)}>
          <span>📌 Pinned Messages (0/5)</span>
          <span>{isOpen ? '−' : '+'}</span>
        </div>
        {isOpen && (
          <div className="pins-list">
            <div className="pins-empty">No pinned messages yet.</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pins-section">
      <div className="pins-header" onClick={() => setIsOpen(!isOpen)}>
        <span>📌 Pinned Messages ({pinnedMessages.length}/5)</span>
        <span>{isOpen ? '−' : '+'}</span>
      </div>
      {isOpen && (
        <div className="pins-list">
          {pinnedMessages.map((msg) => (
            <div
              key={msg.id}
              className="pin-item"
              onClick={() => onJumpToMessage(msg.id)}
            >
              <div className="pin-sender">{msg.sender}</div>
              <div className="pin-snippet">
                {msg.type === 'text' 
                  ? msg.message.slice(0, 60) 
                  : msg.type === 'image' 
                    ? '📷 Image' 
                    : '🎤 Voice'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PinnedMessages;
