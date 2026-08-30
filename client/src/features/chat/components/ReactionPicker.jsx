import { useState, useEffect, useRef } from 'react';

const REACTIONS = ['❤️', '🔥', '😂', '👍', '😮', '💯', '🎉', '🤯', '👀', '✅'];

const ReactionPicker = ({
  isOpen,
  onClose,
  onSelect,
  position = 'bottom',
  triggerRef = null,
  customReactions = null,
}) => {
  const [selectedReaction, setSelectedReaction] = useState(null);
  const pickerRef = useRef(null);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });

  const reactions = customReactions || REACTIONS;

  // Calculate position based on trigger element
  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const pickerWidth = 280;
      const pickerHeight = 60;

      let top = rect.bottom + 8;
      let left = rect.left + rect.width / 2 - pickerWidth / 2;

      // Adjust if going off screen
      if (top + pickerHeight > window.innerHeight) {
        top = rect.top - pickerHeight - 8;
      }
      if (left < 10) left = 10;
      if (left + pickerWidth > window.innerWidth - 10) {
        left = window.innerWidth - pickerWidth - 10;
      }

      setPickerPosition({ top, left });
    }
  }, [isOpen, triggerRef]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleReactionClick = (emoji) => {
    setSelectedReaction(emoji);
    onSelect?.(emoji);
    onClose?.();
  };

  const handleMouseEnter = (emoji) => {
    setSelectedReaction(emoji);
  };

  if (!isOpen) return null;

  const styles = {
    position: 'fixed',
    top: pickerPosition.top,
    left: pickerPosition.left,
    zIndex: 1000,
    display: 'flex',
    gap: '6px',
    padding: '8px 12px',
    background: 'var(--panel, #111827)',
    border: '1px solid var(--border, rgba(99,210,255,0.12))',
    borderRadius: '12px',
    boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
    animation: 'fadeUp 0.15s ease both',
    backdropFilter: 'blur(12px)',
    maxWidth: '320px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  };

  const reactionStyles = {
    padding: '4px 6px',
    fontSize: '22px',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.12s ease',
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
  };

  const reactionHoverStyles = {
    transform: 'scale(1.25)',
    background: 'rgba(255,255,255,0.08)',
  };

  const selectedStyles = {
    transform: 'scale(1.3)',
    background: 'rgba(61,214,245,0.15)',
    borderRadius: '8px',
  };

  // Add keyframe animation if not already present
  if (typeof document !== 'undefined') {
    const styleId = 'reaction-picker-styles';
    if (!document.getElementById(styleId)) {
      const styleSheet = document.createElement('style');
      styleSheet.id = styleId;
      styleSheet.textContent = `
        @keyframes reactionFadeUp {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .reaction-picker-container {
          animation: reactionFadeUp 0.15s ease both;
        }
        .reaction-emoji-btn {
          padding: 4px 6px;
          font-size: 22px;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.12s ease;
          background: transparent;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          font-family: inherit;
          line-height: 1;
        }
        .reaction-emoji-btn:hover {
          transform: scale(1.25);
          background: rgba(255,255,255,0.08);
        }
        .reaction-emoji-btn.selected {
          transform: scale(1.3);
          background: rgba(61,214,245,0.15);
          border-radius: 8px;
        }
        @media (max-width: 480px) {
          .reaction-picker-container {
            max-width: 260px;
            padding: 6px 8px;
            gap: 4px;
          }
          .reaction-emoji-btn {
            width: 32px;
            height: 32px;
            font-size: 18px;
            padding: 2px 4px;
          }
        }
      `;
      document.head.appendChild(styleSheet);
    }
  }

  return (
    <div
      ref={pickerRef}
      className="reaction-picker-container"
      style={styles}
      role="menu"
      aria-label="Reaction picker"
    >
      {reactions.map((emoji) => (
        <button
          key={emoji}
          className={`reaction-emoji-btn ${selectedReaction === emoji ? 'selected' : ''}`}
          onClick={() => handleReactionClick(emoji)}
          onMouseEnter={() => handleMouseEnter(emoji)}
          onMouseLeave={() => setSelectedReaction(null)}
          role="menuitem"
          aria-label={`React with ${emoji}`}
          type="button"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default ReactionPicker;
