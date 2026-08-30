import React, { useState, useEffect, useRef } from 'react';
import MessageItem from './MessageItem.jsx';

const ThreadView = ({ threadId, parent, onClose, room, username }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const socket = window.socket;

  useEffect(() => {
    if (!threadId || !socket) return;

    setLoading(true);
    socket.emit('load_thread', { threadId });

    const handleThreadLoaded = ({ messages: threadMsgs }) => {
      setMessages(threadMsgs);
      setLoading(false);
      scrollToBottom();
    };

    const handleReceiveReply = ({ reply }) => {
      if (reply.threadId === threadId) {
        setMessages(prev => [...prev, reply]);
        scrollToBottom();
      }
    };

    const handleThreadUpdated = ({ threadId: updatedThreadId, messages: updatedMessages }) => {
      if (updatedThreadId === threadId) {
        setMessages(updatedMessages);
        scrollToBottom();
      }
    };

    socket.on('thread_loaded', handleThreadLoaded);
    socket.on('receive_reply', handleReceiveReply);
    socket.on('thread_updated', handleThreadUpdated);

    return () => {
      socket.off('thread_loaded', handleThreadLoaded);
      socket.off('receive_reply', handleReceiveReply);
      socket.off('thread_updated', handleThreadUpdated);
    };
  }, [threadId, socket]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    socket.emit('reply_message', {
      room,
      parentId: threadId,
      message: newMessage.trim(),
      sender: username,
    });

    setNewMessage('');
    setSending(false);
  };

  if (!threadId) return null;

  return (
    <div className="thread-view-overlay" onClick={onClose}>
      <div className="thread-view-content" onClick={(e) => e.stopPropagation()}>
        <div className="thread-header">
          <button className="close-thread-btn" onClick={onClose}>
            ✕
          </button>
          <h3>💬 Thread</h3>
          <span className="thread-count">
            {messages.length} {messages.length === 1 ? 'reply' : 'replies'}
          </span>
        </div>

        <div className="thread-messages">
          {parent && (
            <div className="thread-parent">
              <MessageItem
                message={parent}
                isThreadParent={true}
                username={username}
              />
            </div>
          )}

          <div className="thread-divider">
            <span>Replies</span>
          </div>

          {loading ? (
            <div className="thread-loading">Loading replies...</div>
          ) : messages.length === 0 ? (
            <div className="thread-empty">No replies yet. Be the first! 💬</div>
          ) : (
            messages.map((msg, index) => (
              <MessageItem
                key={msg.id || index}
                message={msg}
                inThread={true}
                username={username}
                showAvatar={index === 0 || messages[index - 1]?.sender !== msg.sender}
              />
            ))
          )}

          <div ref={messagesEndRef} />
        </div>

        <form className="thread-input-area" onSubmit={handleSendReply}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Reply to thread..."
            className="thread-input"
            disabled={sending}
          />
          <button type="submit" className="send-thread-btn" disabled={!newMessage.trim() || sending}>
            {sending ? '⏳' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ThreadView;
