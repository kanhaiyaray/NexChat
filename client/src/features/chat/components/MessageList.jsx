import { useRef, useEffect } from 'react';
import MessageItem from './MessageItem.jsx';
import useUnread from '../hooks/useUnread.js';

const MessageList = ({
  messages,
  username,
  reactions,
  readReceipts,
  activePicker,
  setActivePicker,
  onReaction,
  onContextMenu,
  onJumpToMessage,
  onOpenThread,
  editingMessageId,
  editingDraft,
  setEditingDraft,
  onSaveEdit,
  onCancelEdit,
  editSaving,
  roomId,
  clerkId,
  highlightedMessageId = '',
  activeSearchTerm = '',
}) => {
  const displayRoom = 'private';
  const { unreadCount, markRoomAsRead, markAsRead } = useUnread(roomId, clerkId);
  const messagesEndRef = useRef(null);
  const firstUnreadRef = useRef(null);

  // Find first unread message
  const firstUnread = messages.find(m => {
    return !m.readBy?.includes(username);
  });

  useEffect(() => {
    if (firstUnread && firstUnreadRef.current) {
      firstUnreadRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [firstUnread]);

  const handleJumpToUnread = () => {
    if (firstUnread) {
      const element = document.querySelector(`[data-msg-id="${firstUnread.id}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight-unread');
        setTimeout(() => element.classList.remove('highlight-unread'), 3000);
      }
      markRoomAsRead();
    }
  };

  const handleMessageVisible = (msgId) => {
    markAsRead(msgId);
  };

  const highlightText = (text, query) => {
    if (!query.trim() || !text) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        return <mark key={i} className="match-highlight targeted">{part}</mark>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <>
      <div className="date-divider">PRIVATE CHAT · #{displayRoom}</div>

      {unreadCount > 0 && (
        <button 
          className="jump-to-unread-btn"
          onClick={handleJumpToUnread}
        >
          📩 {unreadCount} new message{unreadCount > 1 ? 's' : ''}
          <span className="jump-arrow">↓</span>
        </button>
      )}

      {messages.map((msg, index) => {
        const isOwn = msg.sender === username;
        const showAvatar = index === 0 || messages[index - 1]?.sender !== msg.sender;
        const msgReactions = reactions[msg.id] || {};
        const isEditing = editingMessageId === msg.id;
        const isUnread = !msg.readBy?.includes(username) && !isOwn;
        const isTargeted = highlightedMessageId === msg.id;

        const msgRef = isUnread && firstUnread?.id === msg.id ? firstUnreadRef : null;

        return (
          <div
            key={msg.id}
            ref={msgRef}
            data-msg-id={msg.id}
            className={`msg-wrapper ${isUnread ? 'unread' : ''}`}
          >
            {isUnread && <span className="unread-dot" title="Unread message">●</span>}
            
            <MessageItem
              message={msg}
              isOwn={isOwn}
              showAvatar={showAvatar}
              reactions={msgReactions}
              readReceipts={readReceipts}
              activePicker={activePicker}
              setActivePicker={setActivePicker}
              onReaction={onReaction}
              onContextMenu={onContextMenu}
              onOpenThread={onOpenThread}
              isEditing={isEditing}
              editingDraft={editingDraft}
              setEditingDraft={setEditingDraft}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              editSaving={editSaving}
              username={username}
              isUnread={isUnread}
              onVisible={() => handleMessageVisible(msg.id)}
              isTargeted={isTargeted}
              activeSearchTerm={activeSearchTerm}
              highlightText={highlightText}
            />
          </div>
        );
      })}

      <div ref={messagesEndRef} />
    </>
  );
};

export default MessageList;
