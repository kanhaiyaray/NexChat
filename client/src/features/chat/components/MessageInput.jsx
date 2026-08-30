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
  roomId,
  username,
  clerkUser,
  onFileUploadComplete,
  onFileUploadError,
}) => {
  const inputRef = useRef(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);

  const handleSend = () => {
    if (messageText.trim()) {
      onSend();
    }
  };

  const insertEmoji = (emoji) => {
    setMessageText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleTyping = () => {
    if (onTyping) onTyping();
  };

  const sendVoice = async (audioBase64, duration) => {
    setVoiceUploading(true);
    if (onSendVoice) {
      await onSendVoice(audioBase64, duration);
    }
    setVoiceUploading(false);
  };

  const handleFileUploadComplete = (data) => {
    setFileUploading(false);
    if (onFileUploadComplete) onFileUploadComplete(data);
  };

  const handleFileUploadError = (error) => {
    setFileUploading(false);
    if (onFileUploadError) onFileUploadError(error);
  };

  return (
    <div className="input-bar" style={{ position: 'relative' }}>
      {uploading && (
        <div className="uploading-indicator">
          <span className="spin-icon">⏳</span>
          Uploading...
        </div>
      )}
      {imgUploading && (
        <div className="uploading-indicator">
          <span className="spin-icon">⏳</span>
          Uploading image...
        </div>
      )}
      {voiceUploading && (
        <div className="uploading-indicator">
          <span className="spin-icon">⏳</span>
          Uploading voice message...
        </div>
      )}
      {fileUploading && (
        <div className="uploading-indicator">
          <span className="spin-icon">⏳</span>
          Uploading file...
        </div>
      )}

      <div className="input-row">
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
          value={messageText}
          placeholder="Message your private group..."
          onChange={(event) => {
            setMessageText(event.target.value);
            handleTyping();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          style={{ height: "42px", lineHeight: "18px", paddingTop: "12px" }}
          disabled={disabled}
        />
        <VoiceRecorder onSend={sendVoice} disabled={voiceUploading || fileUploading} />
        <button className="icon-btn" type="button" onClick={() => setShowEmoji((current) => !current)} title="Emoji">
          😊
        </button>
        <button className="icon-btn accent" type="button" onClick={handleSend} title="Send" disabled={disabled}>
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
