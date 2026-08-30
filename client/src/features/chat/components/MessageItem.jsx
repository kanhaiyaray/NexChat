import { useState } from 'react';
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
  onSendReply = null,
  username = '',
}) => {
  const [imageLightbox, setImageLightbox] = useState(null);
  const [showReplies, setShowReplies] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');

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
    ];
    return colors[name?.charCodeAt(0) % colors.length] || colors[0];
  };

  const initials = (name) => {
    return (name || 'U').slice(0, 2).toUpperCase();
  };

  const senderDisplayName = message.displayName || message.sender;
  const hasThread = message.isThreadParent && message.replyCount > 0;
  const replies = message.replies || [];

  const handleSendReply = () => {
    if (replyDraft.trim() && onSendReply) {
      onSendReply(message.id, replyDraft.trim());
      setReplyDraft('');
    }
  };

  return (
    <div className={`msg-row ${isOwn ? 'own' : ''}`} data-msg-id={message.id}>
      {/* ... existing message rendering ... */}
      {/* (Keep the same as before) */}

      {/* ─── INLINE REPLIES ─── */}
      {hasThread && (
        <div className="thread-replies-inline">
          <div 
            className="thread-replies-header" 
            onClick={() => setShowReplies(!showReplies)}
          >
            <span>💬 {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}</span>
            <span className="toggle-replies">{showReplies ? '▲' : '▼'}</span>
          </div>

          {showReplies && (
            <div className="thread-replies-list">
              {replies.map((reply) => (
                <div key={reply.id} className="thread-reply-item">
                  <div className="reply-avatar" style={getAvatarStyle(reply.sender)}>
                    {initials(reply.sender)}
                  </div>
                  <div className="reply-content">
                    <div className="reply-sender">{reply.sender}</div>
                    <div className="reply-message">{reply.message}</div>
                    <div className="reply-time">{formatTime(reply.timestamp)}</div>
                  </div>
                </div>
              ))}

              <div className="thread-reply-input">
                <input
                  type="text"
                  placeholder="Reply to thread..."
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && replyDraft.trim()) {
                      handleSendReply();
                    }
                  }}
                />
                <button 
                  onClick={handleSendReply}
                  disabled={!replyDraft.trim()}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ... rest of the component ... */}
    </div>
  );
};

export default MessageItem;
