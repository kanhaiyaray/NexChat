import { useState, useEffect, useRef } from "react";
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const API_BASE = import.meta.env.VITE_SOCKET_URL || "http://localhost:1000";

const AVATAR_COLOR_PALETTE = [
  "#3dd6f5", "#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#f87171",
  "#60a5fa", "#c084fc", "#fb923c", "#4ade80", "#2dd4bf", "#e879f9"
];

const STATUS_EMOJIS = ['🌟', '💼', '☕', '💻', '🏖️', '🌴', '🎯', '🔥', '💪', '🧘', '📚', '🎧', '😴', '✈️'];

const ProfileModal = ({ isOpen, onClose, clerkUser, currentProfile, onProfileUpdate }) => {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [statusEmoji, setStatusEmoji] = useState("🌟");
  const [statusText, setStatusText] = useState("Available");
  const [visibility, setVisibility] = useState("public");
  const [hideOnlineStatus, setHideOnlineStatus] = useState(false);
  const [hideReadReceipts, setHideReadReceipts] = useState(false);
  const [avatarColor, setAvatarColor] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [activityFeed, setActivityFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  // Crop state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 50, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (currentProfile) {
      setDisplayName(currentProfile.displayName || clerkUser?.username || "");
      setBio(currentProfile.bio || "");
      setStatusEmoji(currentProfile.statusEmoji || "🌟");
      setStatusText(currentProfile.statusText || "Available");
      setVisibility(currentProfile.visibility || "public");
      setHideOnlineStatus(currentProfile.hideOnlineStatus || false);
      setHideReadReceipts(currentProfile.hideReadReceipts || false);
      setAvatarColor(currentProfile.avatarColor || AVATAR_COLOR_PALETTE[0]);
      setAvatarPreview(currentProfile.avatarUrl || "");
      setActivityFeed(currentProfile.activityFeed || []);
    }
  }, [currentProfile, clerkUser]);

  const handleSave = async () => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("displayName", displayName);
    formData.append("bio", bio);
    formData.append("statusEmoji", statusEmoji);
    formData.append("statusText", statusText);
    formData.append("visibility", visibility);
    formData.append("hideOnlineStatus", hideOnlineStatus.toString());
    formData.append("hideReadReceipts", hideReadReceipts.toString());
    formData.append("avatarColor", avatarColor);
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    try {
      const url = `${API_BASE}/api/user/profile/${clerkUser?.id}`;
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Update failed");
      if (onProfileUpdate) onProfileUpdate(data.profile);
      onClose();
    } catch (err) {
      setError(err.message);
      console.error("Profile save error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed");
        return;
      }
      // Open crop modal
      const reader = new FileReader();
      reader.onload = () => {
        setCropImageSrc(reader.result);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Crop logic
  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    const cropWidth = Math.min(width * 0.7, 300);
    const cropHeight = cropWidth; // 1:1 aspect
    const cropX = (width - cropWidth) / 2;
    const cropY = (height - cropHeight) / 2;
    setCrop({
      unit: 'px',
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
      aspect: 1,
    });
  };

  const getCroppedImg = () => {
    return new Promise((resolve, reject) => {
      if (!completedCrop) return reject("No crop selected");
      const image = imgRef.current;
      if (!image) return reject("No image");

      const canvas = document.createElement('canvas');
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;
      const cropX = completedCrop.x * scaleX;
      const cropY = completedCrop.y * scaleY;
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        image,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );
      canvas.toBlob((blob) => {
        if (!blob) return reject("Canvas to blob failed");
        const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
        resolve(file);
      }, "image/jpeg", 0.9);
    });
  };

  const confirmCrop = async () => {
    try {
      const croppedFile = await getCroppedImg();
      setAvatarFile(croppedFile);
      const previewUrl = URL.createObjectURL(croppedFile);
      // revoke old preview if any
      if (avatarPreview && avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(previewUrl);
      setCropModalOpen(false);
    } catch (err) {
      setError("Crop failed: " + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="profile-modal-overlay" onClick={onClose}>
        <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
          <div className="profile-modal-header">
            <h3>Edit Profile</h3>
            <button className="profile-modal-close" onClick={onClose}>×</button>
          </div>

          <div className="profile-modal-body">
            {error && <div className="profile-error">{error}</div>}

            <div className="profile-avatar-section">
              <div
                className="profile-avatar-preview"
                style={{ background: avatarColor }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" />
                ) : (
                  <span className="profile-avatar-initials">
                    {clerkUser?.fullName?.[0] || clerkUser?.username?.[0] || "U"}
                  </span>
                )}
              </div>
              <button
                className="profile-upload-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                📷 Upload Avatar
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileSelect}
              />
            </div>

            <div className="profile-color-section">
              <label>Avatar Color Theme</label>
              <div className="profile-color-palette">
                {AVATAR_COLOR_PALETTE.map(color => (
                  <button
                    key={color}
                    className={`profile-color-option ${avatarColor === color ? "active" : ""}`}
                    style={{ background: color }}
                    onClick={() => setAvatarColor(color)}
                  />
                ))}
              </div>
            </div>

            {/* Display Name */}
            <div className="profile-field">
              <label>Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
                placeholder="Your display name..."
                className="profile-input"
              />
            </div>

            {/* Status */}
            <div className="profile-field">
              <label>Status</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {STATUS_EMOJIS.map(em => (
                    <button
                      key={em}
                      onClick={() => setStatusEmoji(em)}
                      style={{
                        fontSize: '20px',
                        padding: '4px',
                        border: statusEmoji === em ? '2px solid var(--cyan)' : '1px solid transparent',
                        borderRadius: '6px',
                        background: 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value.slice(0, 40))}
                  placeholder="Status text..."
                  className="profile-input"
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            {/* Bio */}
            <div className="profile-field">
              <label>Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 160))}
                placeholder="Tell something about yourself..."
                maxLength={160}
                rows={3}
                className="profile-textarea"
              />
              <span className="profile-char-count">{bio.length}/160</span>
            </div>

            {/* Visibility */}
            <div className="profile-field">
              <label>Profile Visibility</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="profile-input"
              >
                <option value="public">Public</option>
                <option value="friends">Friends</option>
                <option value="private">Private</option>
              </select>
            </div>

            {/* Privacy toggles */}
            <div className="profile-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={hideOnlineStatus}
                  onChange={(e) => setHideOnlineStatus(e.target.checked)}
                />
                Hide my online status
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={hideReadReceipts}
                  onChange={(e) => setHideReadReceipts(e.target.checked)}
                />
                Hide read receipts
              </label>
            </div>

            {/* Activity Feed (self only) */}
            {activityFeed.length > 0 && (
              <div className="profile-field">
                <label>Recent Activity</label>
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px' }}>
                  {activityFeed.slice().reverse().map((item, idx) => (
                    <div key={idx} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--muted)', marginRight: '8px' }}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>{item.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="profile-modal-footer">
            <button className="profile-cancel-btn" onClick={onClose}>Cancel</button>
            <button className="profile-save-btn" onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {cropModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setCropModalOpen(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="profile-modal-header">
              <h3>Crop Avatar</h3>
              <button className="profile-modal-close" onClick={() => setCropModalOpen(false)}>×</button>
            </div>
            <div className="profile-modal-body">
              {cropImageSrc && (
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    src={cropImageSrc}
                    alt="Crop preview"
                    onLoad={onImageLoad}
                    style={{ maxWidth: '100%' }}
                  />
                </ReactCrop>
              )}
            </div>
            <div className="profile-modal-footer">
              <button className="profile-cancel-btn" onClick={() => setCropModalOpen(false)}>Cancel</button>
              <button className="profile-save-btn" onClick={confirmCrop}>Apply Crop</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileModal;