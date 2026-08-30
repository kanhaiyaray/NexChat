import { useRef, useState } from 'react';
import VoiceRecorder from '../../media/components/VoiceRecorder.jsx';
import FileUpload from '../../media/components/FileUpload.jsx';

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
  room,
  sender,
  clerkId,
  onFileUploadComplete,
  onFileUploadError,
}) => {
  const inputRef = useRef(null);

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

      <div className="input-row">
        {/* 🆕 SINGLE FILE UPLOAD BUTTON - handles both images and documents */}
        <FileUpload
          room={roomId}
          sender={username}
          clerkId={clerkUser?.id}
          onUploadComplete={handleFileUploadComplete}
          onError={handleFileUploadError}
          disabled={imgUploading || voiceUploading || fileUploading}
        />

        <textarea
          ref={inputRef}
          className="msg-input"
          rows={1}
          value={message}
          placeholder="Message your private group..."
          onChange={(event) => {
            setMessage(event.target.value);
            handleTyping();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
          style={{ height: "42px", lineHeight: "18px", paddingTop: "12px" }}
        />
        <VoiceRecorder onSend={sendVoice} disabled={voiceUploading || fileUploading} />
        <button className="icon-btn" type="button" onClick={() => setShowEmoji((current) => !current)} title="Emoji">
          😊
        </button>
        <button className="icon-btn accent" type="button" onClick={sendMessage} title="Send">
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