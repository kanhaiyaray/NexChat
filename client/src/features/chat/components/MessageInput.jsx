import { useRef, useState } from 'react';
import VoiceRecorder from '../../media/components/VoiceRecorder.jsx';

const EMOJI_PANEL = ['😂', '🔥', '❤️', '👍', '😮', '😢', '🎉', '💀', '🤯', '👀', '✅', '💯'];

const MessageInput = ({
  messageText,
  setMessageText,
  onSend,
  onTyping,
  onSendImage,
  onSendVoice,
  uploading,
  showEmoji,
  setShowEmoji,
  disabled,
}) => {
  const fileRef = useRef(null);
  const inputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSendImage = () => {
    if (!image) return;
    const reader = new FileReader();
    reader.onload = () => {
      onSendImage(reader.result);
      setImage(null);
      setImagePreview(null);
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsDataURL(image);
  };

  const clearImage = () => {
    setImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSend = () => {
    if (messageText.trim()) {
      onSend();
    }
  };

  const insertEmoji = (emoji) => {
    setMessageText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="input-bar" style={{ position: 'relative' }}>
      {uploading && (
        <div className="uploading-indicator">
          <span className="spin-icon">⏳</span>
          Uploading...
        </div>
      )}

      {imagePreview && !uploading && (
        <div className="image-preview">
          <img className="preview-thumb" src={imagePreview} alt="preview" />
          <span className="preview-name">{image?.name}</span>
          <div className="preview-remove" onClick={clearImage}>×</div>
          <button className="icon-btn accent" onClick={handleSendImage} style={{ width: 36, height: 36 }}>
            ↑
          </button>
        </div>
      )}

      <div className="input-row">
        <input 
          ref={fileRef} 
          type="file" 
          accept="image/*" 
          onChange={handleImageSelect} 
          style={{ display: 'none' }} 
        />
        <button 
          className="icon-btn" 
          onClick={() => fileRef.current?.click()} 
          disabled={uploading}
          title="Attach image"
        >
          📎
        </button>

        <textarea
          ref={inputRef}
          className="msg-input"
          rows={1}
          value={messageText}
          placeholder="Message your private group..."
          onChange={(e) => {
            setMessageText(e.target.value);
            onTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          style={{ height: '42px', lineHeight: '18px', paddingTop: '12px' }}
          disabled={disabled}
        />

        <VoiceRecorder onSend={onSendVoice} disabled={uploading || disabled} />

        <button 
          className="icon-btn" 
          onClick={() => setShowEmoji(prev => !prev)}
          title="Emoji"
        >
          😊
        </button>

        <button 
          className="icon-btn accent" 
          onClick={handleSend}
          disabled={!messageText.trim() || disabled}
          title="Send"
        >
          ➤
        </button>
      </div>

      {showEmoji && (
        <div className="emoji-picker">
          {EMOJI_PANEL.map((emoji) => (
            <span key={emoji} className="emoji-btn" onClick={() => insertEmoji(emoji)}>
              {emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageInput;
