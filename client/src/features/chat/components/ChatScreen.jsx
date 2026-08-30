import { useRef, useEffect, useState } from 'react';
import ChatHeader from './ChatHeader.jsx';
import MessageList from './MessageList.jsx';
import MessageInput from './MessageInput.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import PinnedMessages from './PinnedMessages.jsx';
import { useChat } from '../hooks/useChat.js';
import { useMessages } from '../hooks/useMessages.js';
import { useTyping } from '../hooks/useTyping.js';
import { useReadReceipts } from '../hooks/useReadReceipts.js';

const ChatScreen = ({ username, roomId, code, clerkUser, onLeave }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [activePicker, setActivePicker] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  
  const endRef = useRef(null);
  const messagesAreaRef = useRef(null);

  const {
    messages,
    users,
    typing,
    loading,
    error,
    reactions,
    pinnedMessages,
    readReceipts,
    socket,
    setMessages,
    setReactions,
  } = useChat(roomId, code, username, clerkUser?.id);

  const {
    messageText,
    setMessageText,
    editingMessageId,
    setEditingMessageId,
    editingDraft,
    setEditingDraft,
    editSaving,
    uploading,
    sendMessage,
    sendImage,
    sendVoice,
    deleteMessage,
    editMessage,
    addReaction,
    pinMessage,
    unpinMessage,
    markAsRead,
    loadMessageContext,
  } = useMessages(socket, roomId, username, clerkUser?.id);

  const { handleTyping } = useTyping(socket, roomId, username);
  useReadReceipts(messages, roomId, username, socket, readReceipts);

  const handleContextMenu = (event, msgId, sender) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      msgId,
      sender,
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleDeleteMessage = () => {
    if (contextMenu?.msgId) {
      deleteMessage(contextMenu.msgId);
      closeContextMenu();
    }
  };

  const handleEditMessage = () => {
    if (contextMenu?.msgId) {
      const target = messages.find(m => m.id === contextMenu.msgId);
      if (target) {
        setEditingMessageId(target.id);
        setEditingDraft(target.message);
        closeContextMenu();
      }
    }
  };

  const handlePinMessage = () => {
    if (contextMenu?.msgId) {
      pinMessage(contextMenu.msgId);
      closeContextMenu();
    }
  };

  const handleUnpinMessage = () => {
    if (contextMenu?.msgId) {
      unpinMessage(contextMenu.msgId);
      closeContextMenu();
    }
  };

  const handleReaction = (msgId, emoji) => {
    addReaction(msgId, emoji);
    setActivePicker(null);
    closeContextMenu();
  };

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  if (loading) {
    return <div className="history-loading">Loading chat...</div>;
  }

  if (error) {
    return <div className="error-msg">{error}</div>;
  }

  return (
    <div className="chat-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-dot" />
            NexChat
          </div>
          <button 
            className="mobile-menu-close" 
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>
        
        <div className="users-section">
          <div className="section-label">Members - {users.length}</div>
          {users.map((user) => (
            <div key={user.id} className="user-item">
              <div className="avatar" style={{ background: user.avatarColor || '#3dd6f5' }}>
                {user.displayName?.[0] || user.username[0]}
              </div>
              <span className="user-name">
                {user.displayName || user.username}
              </span>
              {user.id === socket.id && <span className="you-tag">you</span>}
            </div>
          ))}
        </div>

        <PinnedMessages 
          pinnedMessages={pinnedMessages}
          onJumpToMessage={loadMessageContext}
        />

        <div className="sidebar-footer">
          <button 
            className="edit-profile-btn"
            onClick={() => setProfileModalOpen(true)}
          >
            ✎ Edit Profile
          </button>
          <button 
            className="sidebar-signout"
            onClick={onLeave}
          >
            Leave Room
          </button>
        </div>
      </aside>

      <main className="chat-main">
        <ChatHeader 
          roomId={roomId}
          code={code}
          users={users}
          onCopyLink={() => {}}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="messages-area" ref={messagesAreaRef}>
          <MessageList
            messages={messages}
            username={username}
            reactions={reactions}
            readReceipts={readReceipts}
            activePicker={activePicker}
            setActivePicker={setActivePicker}
            onReaction={handleReaction}
            onContextMenu={handleContextMenu}
            onJumpToMessage={loadMessageContext}
            editingMessageId={editingMessageId}
            editingDraft={editingDraft}
            setEditingDraft={setEditingDraft}
            onSaveEdit={editMessage}
            onCancelEdit={() => setEditingMessageId('')}
            editSaving={editSaving}
          />
          <div ref={endRef} />
        </div>

        <TypingIndicator typing={typing} />

        <MessageInput
          messageText={messageText}
          setMessageText={setMessageText}
          onSend={sendMessage}
          onTyping={handleTyping}
          onSendImage={sendImage}
          onSendVoice={sendVoice}
          uploading={uploading}
          showEmoji={showEmoji}
          setShowEmoji={setShowEmoji}
          disabled={false}
        />
      </main>

      {contextMenu?.visible && (
        <div 
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
        </div>
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="full view" />
        </div>
      )}
    </div>
  );
};

export default ChatScreen;
