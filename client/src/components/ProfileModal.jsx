import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_SOCKET_URL || "http://localhost:1000";

const AVATAR_COLOR_PALETTE = [
  "#3dd6f5", "#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#f87171",
  "#60a5fa", "#c084fc", "#fb923c", "#4ade80", "#2dd4bf", "#e879f9"
];

const ProfileModal = ({ isOpen, onClose, clerkUser, currentProfile, onProfileUpdate }) => {
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState("");
  const [avatarColor, setAvatarColor] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentProfile) {
      setBio(currentProfile.bio || "");
      setStatus(currentProfile.status || "🌟 Available");
      setAvatarColor(currentProfile.avatarColor || AVATAR_COLOR_PALETTE[0]);
      setAvatarPreview(currentProfile.avatarUrl || "");
    }
  }, [currentProfile]);

  // Clean up blob URL when modal closes
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleSave = async () => {
    setLoading(true);
    setError("");
    
    const formData = new FormData();
    formData.append("bio", bio);
    formData.append("status", status);
    formData.append("avatarColor", avatarColor);
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }
    
    try {
      // ✅ FIXED: Using full URL with API_BASE instead of relative path
      const url = `${API_BASE}/api/user/profile/${clerkUser?.id}`;
      console.log("Saving profile to:", url);
      
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
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB");
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed");
        return;
      }
      
      setAvatarFile(file);
      // Clean up old preview if it exists
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  if (!isOpen) return null;

  return (
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
          
          <div className="profile-field">
            <label>Status</label>
            <input
              type="text"
              value={status}
              onChange={(e) => setStatus(e.target.value.slice(0, 40))}
              placeholder="Your status..."
              maxLength={40}
              className="profile-input"
            />
          </div>
          
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
        </div>
        
        <div className="profile-modal-footer">
          <button className="profile-cancel-btn" onClick={onClose}>Cancel</button>
          <button className="profile-save-btn" onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;