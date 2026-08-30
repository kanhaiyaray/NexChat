import { useState, useEffect, useRef } from 'react';
import VoicePlayer from '../../media/components/VoicePlayer.jsx';

const REACTIONS = ['❤️', '🔥', '😂', '👍', '😮', '💯'];

const MessageItem = ({
  message,
  isOwn,
  showAvatar = true,
  reactions: msgReactions,
  readReceipts,
  activePicker,
  setActivePicker,
  onReaction,
  onContextMenu,
  isEditing,
  editingDraft,
  setEditingDraft,
  onSaveEdit,
  onCancelEdit,
  editSaving,
  inThread = false,
  isThreadParent = false,
  onOpenThread = null,
  username = '',
  isUnread = false,
  onVisible = null,
}) => {
  const [imageLightbox, setImageLightbox] = useState(null);
  const [showReplies, setShowReplies] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const msgRef = useRef(null);

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAvatarStyle = (name) => {
    const colors = [
      ['rgba(61,214,245,.25)', '#3dd6f5'],
      ['rgba(167,139,250,.25)', '#a78bfa'],
      ['rgba(244,114,182,.25)', '#f472b6'],
      ['rgba(52,211,153,.25)', '#34d399'],
      ['rgba(251,191,36,.25)', '#fbbf24'],
      ['rgba(248,113,113,.25)', '#f87171'],
    ];
    return colors[name?.charCodeAt(0) % colors.length] || colors[0];
  };

  const initials = (name) => {
    return (name || 'U').slice(0, 2).toUpperCase();
  };

  const senderDisplayName = message.displayName || message.sender;
  const hasThread = message.isThreadParent && message.replyCount > 0;

  // Intersection Observer for marking as read
  useEffect(() => {
    if (!isUnread || !onVisible || !msgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            onVisible();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(msgRef.current);

    return () => observer.disconnect();
  }, [isUnread, onVisible]);

  return (
    <div 
      ref={msgRef}
      className={`msg-row ${isOwn ? 'own' : ''} ${inThread ? 'in-thread' : ''} ${isUnread ? 'unread' : ''}`} 
      data-msg-id={message.id}
    >
      {!isOwn && (
        <div style={{ width: 30, flexShrink: 0 }}>
          {showAvatar && (
            <div
              className="msg-avatar"
              style={getAvatarStyle(message.sender)}
            >
              {initials(message.sender)}
            </div>
          )}
        </div>
      )}

      <div className="msg-content">
        {showAvatar && !isOwn && (
          <div className="msg-sender">{senderDisplayName}</div>
        )}

        <div style={{ position: 'relative' }}>
          {isEditing ? (
            <div className="message-edit-box">
              <textarea
                className="message-edit-input"
                value={editingDraft}
                onChange={(e) => setEditingDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onCancelEdit();
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    onSaveEdit(message.id, editingDraft);
                  }
                }}
                placeholder="Edit your message..."
              />
              <div className="message-edit-actions">
                <button
                  className="message-edit-btn"
                  onClick={onCancelEdit}
                  disabled={editSaving}
                >
                  Cancel
                </button>
                <button
                  className="message-edit-btn primary"
                  onClick={() => onSaveEdit(message.id, editingDraft)}
                  disabled={editSaving || !editingDraft.trim()}
                >
                  {editSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`msg-bubble ${isOwn ? 'own' : 'other'} ${isThreadParent ? 'thread-parent' : ''}`}
              onContextMenu={(e) => onContextMenu?.(e, message.id, message.sender)}
              onDoubleClick={() => setActivePicker?.(activePicker === message.id ? null : message.id)}
              style={{ cursor: 'pointer' }}
            >
              {message.type === 'image' ? (
                <>
                  <img
                    className="msg-img"
                    src={message.imageUrl}
                    alt="shared"
                    onClick={() => setImageLightbox(message.imageUrl)}
                  />
                </>
              ) : message.type === 'voice' ? (
                <VoicePlayer
                  audioUrl={message.voiceUrl}
                  duration={message.voiceDuration}
                />
              ) : (
                message.message
              )}
            </div>
          )}

          {activePicker === message.id && (
            <div className="reaction-picker">
              {REACTIONS.map((emoji) => (
                <span
                  key={emoji}
                  className="reaction-opt"
                  onClick={() => onReaction?.(message.id, emoji)}
                >
                  {emoji}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Thread indicator */}
        {hasThread && onOpenThread && (
          <button
            className="view-thread-btn"
            onClick={() => onOpenThread(message.id)}
          >
            💬 View {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}

        {Object.keys(msgReactions || {}).length > 0 && (
          <div className="msg-reactions">
            {Object.entries(msgReactions).map(([emoji, count]) => (
              <div
                key={emoji}
                className="reaction-chip"
                onClick={() => onReaction?.(message.id, emoji)}
              >
                {emoji}
                <span>{count}</span>
              </div>
            ))}
          </div>
        )}

        <div className="msg-time">
          {formatTime(message.timestamp)}
          {message.edited && <span className="edited-tag">(edited)</span>}
          {isOwn && readReceipts?.[message.id] && readReceipts[message.id].count > 0 && (
            <div className="read-receipt" title={readReceipts[message.id].readBy.join(', ')}>
              {readReceipts[message.id].count === 1 ? '✓ Seen' : `✓ Seen by ${readReceipts[message.id].count}`}
            </div>
          )}
        </div>
      </div>

      {isOwn && <div style={{ width: 30, flexShrink: 0 }} />}

      {imageLightbox && (
        <div className="lightbox" onClick={() => setImageLightbox(null)}>
          <img src={imageLightbox} alt="full view" />
        </div>
      )}
    </div>
  );
};

export default MessageItem;
