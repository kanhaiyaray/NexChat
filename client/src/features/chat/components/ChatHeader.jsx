import { useState } from 'react';

const ChatHeader = ({ 
  roomId, code, users, onCopyLink, onToggleSidebar,
  searchQuery, setSearchQuery, runSearch, clearSearch,
  searchLoading, searchResults, searchError, showSearchPanel,
  jumpToSearchResult, searchInputRef, searchShellRef
}) => {
  const [linkCopied, setLinkCopied] = useState(false);

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

  const formatSearchTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="chat-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
        <button 
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
        >
          ☰
        </button>
        <div style={{ minWidth: 0 }}>
          <div className="room-name">🔒 Private Chat</div>
          <div className="room-subtitle">#{displayRoom}</div>
        </div>
      </div>

      <div className="header-meta">
        <div className="header-search-shell" ref={searchShellRef}>
          <form
            className="header-search-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) runSearch(searchQuery);
            }}
          >
            <span className="header-search-icon">🔎</span>
            <input
              ref={searchInputRef}
              className="header-search-input"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (!val.trim()) {
                  clearSearch();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') clearSearch();
              }}
              placeholder="Search this room... (Ctrl+K)"
            />
            <button 
              className="header-search-submit" 
              type="submit"
              disabled={!searchQuery.trim() || searchLoading}
            >
              {searchLoading ? '...' : 'Search'}
            </button>
            <button 
              className="header-search-clear" 
              type="button" 
              onClick={clearSearch}
              disabled={!searchQuery && !searchResults.length}
            >
              Clear
            </button>
          </form>

          {showSearchPanel && (
            <div className="search-inline-panel">
              <div className="search-panel-status">
                <span className="search-panel-pill">#{displayRoom}</span>
                {searchResults.length > 0 && !searchLoading && (
                  <span>{searchResults.length} result{searchResults.length === 1 ? '' : 's'}</span>
                )}
              </div>

              {searchError && <div className="search-error">{searchError}</div>}

              <div className="search-results">
                {searchLoading ? (
                  <div className="search-loading">
                    <span className="spin-icon">⏳</span>
                    Searching room history...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      className="search-result"
                      onClick={() => jumpToSearchResult(result)}
                    >
                      <div className="search-result-top">
                        <span className="search-result-sender">{result.sender}</span>
                        <span>{formatSearchTime(result.timestamp)}</span>
                      </div>
                      <div className="search-result-text">{result.message}</div>
                    </button>
                  ))
                ) : searchQuery.trim() ? (
                  <div className="search-empty">
                    <div className="search-empty-title">No matches</div>
                    <div className="search-empty-copy">
                      Try a simpler keyword, part of a link, or fewer words.
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
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
