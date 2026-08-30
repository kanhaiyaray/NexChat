import { useState } from 'react';

const ChatHeader = ({ roomId, code, users, onCopyLink, onToggleSidebar }) => {
  const [linkCopied, setLinkCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const displayRoom = roomId.replace(/^room_/, '').slice(0, 8) || 'private';
  const inviteLink = `${window.location.origin}/join/${code}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
      onCopyLink?.();
    } catch {
      // Handle error
    }
  };

  const handleSearch = async (query) => {
    setSearchLoading(true);
    try {
      const response = await fetch(`/api/search?code=${code}&roomId=${roomId}&q=${query}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="chat-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button 
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
        >
          ☰
        </button>
        <div>
          <div className="room-name">🔒 Private Chat</div>
          <div className="room-subtitle">#{displayRoom}</div>
        </div>
      </div>

      <div className="header-meta">
        <div className="header-search-shell">
          <form 
            className="header-search-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) handleSearch(searchQuery);
            }}
          >
            <span className="header-search-icon">🔎</span>
            <input
              className="header-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search this room..."
            />
            <button 
              className="header-search-submit" 
              type="submit"
              disabled={!searchQuery.trim() || searchLoading}
            >
              {searchLoading ? '...' : 'Search'}
            </button>
          </form>
        </div>

        <div className="member-count">
          <div className="status-dot" />
          <span>{users.length}</span>
          <span className="label">{users.length === 1 ? 'member' : 'members'}</span>
        </div>

        <button 
          className={`copy-link-btn ${linkCopied ? 'copied' : ''}`}
          onClick={handleCopyLink}
        >
          {linkCopied ? '✓' : '🔗'}
          <span>Invite</span>
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
