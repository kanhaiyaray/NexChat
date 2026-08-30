import { useRef, useEffect, useState } from 'react';
import ChatHeader from './ChatHeader.jsx';
import MessageList from './MessageList.jsx';
import MessageInput from './MessageInput.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import PinnedMessages from './PinnedMessages.jsx';
import ThreadView from './ThreadView.jsx';
import { useChat } from '../hooks/useChat.js';
import { useMessages } from '../hooks/useMessages.js';
import { useTyping } from '../hooks/useTyping.js';
import { useReadReceipts } from '../hooks/useReadReceipts.js';
import ProfileModal from '../../../components/ProfileModal.jsx';

const ChatScreen = ({ username, roomId, code, clerkUser, onLeave }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [activePicker, setActivePicker] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [highlightedMessageId, setHighlightedMessageId] = useState('');
  const [userProfile, setUserProfile] = useState(null);

  // Thread state
  const [threadView, setThreadView] = useState(null);
  const [threadParent, setThreadParent] = useState(null);

  const endRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchShellRef = useRef(null);

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

  // Fetch user profile
  useEffect(() => {
    if (clerkUser?.id) {
      const fetchProfile = async () => {
        try {
          const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:1000';
          const response = await fetch(`${API_BASE}/api/user/profile/${clerkUser.id}`);
          if (response.ok) {
            const data = await response.json();
            setUserProfile(data);
          }
        } catch (err) {
          console.error('Failed to fetch profile:', err);
        }
      };
      fetchProfile();
    }
  }, [clerkUser?.id]);

  // Open thread view
  const openThread = (messageId) => {
    const parent = messages.find(m => m.id === messageId);
    if (parent) {
      setThreadParent(parent);
      setThreadView(messageId);
    }
  };

  const closeThread = () => {
    setThreadView(null);
    setThreadParent(null);
  };

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

  // Search functionality
  const runSearch = async (query) => {
    const trimmedQuery = query.trim();
    setSearchQuery(trimmedQuery);
    setSearchError('');

    if (!trimmedQuery) {
      setSearchResults([]);
      setActiveSearchTerm('');
      return;
    }

    setSearchLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:1000';
      const url = new URL(`${API_BASE}/api/search`);
      url.searchParams.set('code', code);
      url.searchParams.set('roomId', roomId);
      url.searchParams.set('q', trimmedQuery);

      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Search failed.');
      }

      setSearchResults(data.results || []);
      setActiveSearchTerm(trimmedQuery);
    } catch (error) {
      setSearchError(error.message || 'Search failed.');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
    setActiveSearchTerm('');
    setHighlightedMessageId('');
  };

  const jumpToSearchResult = (result) => {
    const term = searchQuery.trim();
    setActiveSearchTerm(term);
    setHighlightedMessageId(result.id);
    const existingNode = document.querySelector(`[data-msg-id="${result.id}"]`);
    if (existingNode) {
      existingNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      loadMessageContext(result.id);
    }
  };

  // File upload handlers
  const handleFileUploadComplete = (data) => {
    console.log('File uploaded:', data);
  };

  const handleFileUploadError = (error) => {
    console.error('File upload error:', error);
  };

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === 'Escape') {
        clearSearch();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (loading) {
    return <div className="history-loading">Loading chat...</div>;
  }

  if (error) {
    return <div className="error-msg">{error}</div>;
  }

  const showSearchPanel = searchLoading || !!searchError || searchResults.length > 0;

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
          <div className="my-info" style={{ cursor: 'pointer' }} onClick={() => setProfileModalOpen(true)}>
            <div className="avatar" style={{ background: userProfile?.avatarColor || '#3dd6f5' }}>
              {userProfile?.displayName?.[0] || username[0]}
            </div>
            <div>
              <div className="my-name">{userProfile?.displayName || username}</div>
              <div className="my-status">{userProfile?.statusText || '● Active'}</div>
            </div>
          </div>
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
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          runSearch={runSearch}
          clearSearch={clearSearch}
          searchLoading={searchLoading}
          searchResults={searchResults}
          searchError={searchError}
          showSearchPanel={showSearchPanel}
          jumpToSearchResult={jumpToSearchResult}
          searchInputRef={searchInputRef}
          searchShellRef={searchShellRef}
        />

        <div className="messages-area" ref={messagesAreaRef}>
          {activeSearchTerm && highlightedMessageId && (
            <div className="search-context-bar">
              <div>
                Showing search context for <strong>"{activeSearchTerm}"</strong>.
              </div>
              <button type="button" className="jump-badge" onClick={() => {
                setActiveSearchTerm('');
                setHighlightedMessageId('');
              }}>
                Clear highlight
              </button>
            </div>
          )}
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
            onOpenThread={openThread}
            editingMessageId={editingMessageId}
            editingDraft={editingDraft}
            setEditingDraft={setEditingDraft}
            onSaveEdit={editMessage}
            onCancelEdit={() => setEditingMessageId('')}
            editSaving={editSaving}
            roomId={roomId}
            clerkId={clerkUser?.id}
            highlightedMessageId={highlightedMessageId}
            activeSearchTerm={activeSearchTerm}
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
          roomId={roomId}
          username={username}
          clerkUser={clerkUser}
          onFileUploadComplete={handleFileUploadComplete}
          onFileUploadError={handleFileUploadError}
        />
      </main>

      {contextMenu?.visible && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="reaction-row">
            {['❤️', '🔥', '😂', '👍', '😮', '💯'].map((emoji) => (
              <span
                key={emoji}
                className="reaction-opt"
                onClick={() => handleReaction(contextMenu.msgId, emoji)}
              >
                {emoji}
              </span>
            ))}
          </div>
          {contextMenu.sender === username && (
            <>
              <div className="context-menu-divider" />
              <div className="context-menu-item" onClick={handleEditMessage}>
                Edit message
              </div>
              <div className="context-menu-item" onClick={handleDeleteMessage}>
                Delete message
              </div>
              <div className="context-menu-item" onClick={handlePinMessage}>
                📌 Pin message
              </div>
              {pinnedMessages.some(m => m.id === contextMenu.msgId) && (
                <div className="context-menu-item" onClick={handleUnpinMessage}>
                  📌 Unpin
                </div>
              )}
            </>
          )}
        </div>
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="full view" />
        </div>
      )}

      {/* Thread View Modal */}
      {threadView && (
        <ThreadView
          threadId={threadView}
          parent={threadParent}
          onClose={closeThread}
          room={roomId}
          username={username}
        />
      )}

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        clerkUser={clerkUser}
        currentProfile={userProfile}
        onProfileUpdate={(updatedProfile) => {
          setUserProfile(updatedProfile);
        }}
      />
    </div>
  );
};

export default ChatScreen;
