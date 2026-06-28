import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserProfile, updateUserProfile } from '../../api/admin'; // we'll need to add these
import { fetchSettings, updateSettings, exportCSV } from '../../api/admin';
import { UserProfile as ClerkUserProfile } from '@clerk/clerk-react';

// Mock fetchUserProfile – we already have fetchAdminStats but we need the current user's profile.
// We'll reuse the existing GET /api/user/profile/:clerkId endpoint.
// Add this to api/admin.js:
/*
export async function fetchUserProfile(clerkId) {
  const res = await fetch(`${API_BASE}/api/user/profile/${clerkId}?requesterId=${clerkId}`, {
    headers: { 'x-clerk-id': clerkId }
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}
export async function updateUserProfile(clerkId, data) {
  const res = await fetch(`${API_BASE}/api/user/profile/${clerkId}?clerkId=${clerkId}`, {
    method: 'POST',
    headers: { 'x-clerk-id': clerkId, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
}
*/

export default function Profile() {
  const { user } = useUser();
  const clerkId = user?.id;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('personal');

  // ----- Personal Info -----
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile', clerkId],
    queryFn: () => fetchUserProfile(clerkId),
    enabled: !!clerkId
  });

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [statusEmoji, setStatusEmoji] = useState('🌟');
  const [statusText, setStatusText] = useState('Available');
  const [avatarColor, setAvatarColor] = useState('#3dd6f5');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setStatusEmoji(profile.statusEmoji || '🌟');
      setStatusText(profile.statusText || 'Available');
      setAvatarColor(profile.avatarColor || '#3dd6f5');
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => updateUserProfile(clerkId, data),
    onSuccess: () => queryClient.invalidateQueries(['userProfile'])
  });

  const handlePersonalSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      displayName,
      bio,
      statusEmoji,
      statusText,
      avatarColor
    });
  };

  // ----- Privacy -----
  const [visibility, setVisibility] = useState('public');
  const [hideOnlineStatus, setHideOnlineStatus] = useState(false);
  const [hideReadReceipts, setHideReadReceipts] = useState(false);

  useEffect(() => {
    if (profile) {
      setVisibility(profile.visibility || 'public');
      setHideOnlineStatus(profile.hideOnlineStatus || false);
      setHideReadReceipts(profile.hideReadReceipts || false);
    }
  }, [profile]);

  const handlePrivacySubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate({ visibility, hideOnlineStatus, hideReadReceipts });
  };

  // ----- System Settings -----
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['systemSettings', clerkId],
    queryFn: () => fetchSettings(clerkId),
    enabled: !!clerkId
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => updateSettings(data, clerkId),
    onSuccess: () => queryClient.invalidateQueries(['systemSettings'])
  });

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maxMessageLength, setMaxMessageLength] = useState(5000);
  const [allowImageUploads, setAllowImageUploads] = useState(true);
  const [allowNewRooms, setAllowNewRooms] = useState(true);
  const [siteName, setSiteName] = useState('NexChat');

  useEffect(() => {
    if (settings) {
      setMaintenanceMode(settings.maintenanceMode || false);
      setMaxMessageLength(settings.maxMessageLength || 5000);
      setAllowImageUploads(settings.allowImageUploads !== undefined ? settings.allowImageUploads : true);
      setAllowNewRooms(settings.allowNewRooms !== undefined ? settings.allowNewRooms : true);
      setSiteName(settings.siteName || 'NexChat');
    }
  }, [settings]);

  const handleSystemSubmit = (e) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      maintenanceMode,
      maxMessageLength,
      allowImageUploads,
      allowNewRooms,
      siteName
    });
  };

  // ----- Export -----
  const handleExport = async (type) => {
    try {
      const blob = await exportCSV(type, clerkId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  // ----- Render -----
  if (!clerkId) return <div>Loading...</div>;

  const tabs = [
    { id: 'personal', label: '👤 Personal' },
    { id: 'privacy', label: '🔒 Privacy' },
    { id: 'security', label: '🔐 Security' },
    { id: 'system', label: '⚙️ System' },
    { id: 'export', label: '📤 Export' }
  ];

  return (
    <div style={{ color: '#e2e8f0' }}>
      <h2 style={{ marginBottom: 24 }}>⚙️ Profile & Settings</h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(0,229,255,0.12)', marginBottom: 24 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #00e5ff' : '2px solid transparent',
              color: activeTab === tab.id ? '#00e5ff' : '#94a3b8',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 600 : 400,
              transition: '0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ background: 'linear-gradient(145deg, #141b2b, #0f172a)', borderRadius: 16, padding: 24, border: '1px solid rgba(0,229,255,0.08)' }}>
        {activeTab === 'personal' && (
          <form onSubmit={handlePersonalSubmit}>
            <h3 style={{ marginBottom: 16 }}>Personal Information</h3>
            <div style={{ display: 'grid', gap: 16, maxWidth: 500 }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 4 }}>Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="profile-input"
                />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 4 }}>Username</label>
                <input
                  type="text"
                  value={profile?.username || ''}
                  disabled
                  className="profile-input"
                  style={{ opacity: 0.6 }}
                />
                <small style={{ color: '#64748b' }}>Username cannot be changed (used in chat)</small>
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 4 }}>Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 160))}
                  rows={3}
                  className="profile-textarea"
                />
                <span className="profile-char-count">{bio.length}/160</span>
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 4 }}>Status</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={statusEmoji}
                    onChange={(e) => setStatusEmoji(e.target.value)}
                    style={{ width: 60, textAlign: 'center' }}
                    className="profile-input"
                  />
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
              <div>
                <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 4 }}>Avatar Color Theme</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['#3dd6f5','#a78bfa','#f472b6','#34d399','#fbbf24','#f87171','#60a5fa','#c084fc','#fb923c','#4ade80'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatarColor(c)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: c,
                        border: avatarColor === c ? '2px solid white' : '2px solid transparent',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="profile-save-btn"
                style={{ width: 'auto' }}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Personal Info'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'privacy' && (
          <form onSubmit={handlePrivacySubmit}>
            <h3 style={{ marginBottom: 16 }}>Privacy Settings</h3>
            <div style={{ display: 'grid', gap: 16, maxWidth: 500 }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 4 }}>Profile Visibility</label>
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
              <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  checked={hideOnlineStatus}
                  onChange={(e) => setHideOnlineStatus(e.target.checked)}
                />
                Hide my online status
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  checked={hideReadReceipts}
                  onChange={(e) => setHideReadReceipts(e.target.checked)}
                />
                Hide read receipts
              </label>
              <button
                type="submit"
                className="profile-save-btn"
                style={{ width: 'auto' }}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Privacy Settings'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'security' && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Security</h3>
            <p style={{ color: '#94a3b8', marginBottom: 16 }}>
              Manage your password, email, and multi‑factor authentication via Clerk.
            </p>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12 }}>
              <ClerkUserProfile />
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <form onSubmit={handleSystemSubmit}>
            <h3 style={{ marginBottom: 16 }}>System Settings</h3>
            <div style={{ display: 'grid', gap: 16, maxWidth: 500 }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 4 }}>Site Name</label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="profile-input"
                />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 4 }}>Max Message Length</label>
                <input
                  type="number"
                  value={maxMessageLength}
                  onChange={(e) => setMaxMessageLength(Number(e.target.value))}
                  className="profile-input"
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  checked={allowImageUploads}
                  onChange={(e) => setAllowImageUploads(e.target.checked)}
                />
                Allow image uploads
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  checked={allowNewRooms}
                  onChange={(e) => setAllowNewRooms(e.target.checked)}
                />
                Allow creation of new rooms
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                />
                Maintenance mode (prevents new logins/joins)
              </label>
              <button
                type="submit"
                className="profile-save-btn"
                style={{ width: 'auto' }}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save System Settings'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'export' && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Export Data</h3>
            <p style={{ color: '#94a3b8', marginBottom: 16 }}>
              Download data as CSV files.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => handleExport('users')} className="action-btn" style={{ padding: '8px 20px' }}>
                📥 Users
              </button>
              <button onClick={() => handleExport('rooms')} className="action-btn" style={{ padding: '8px 20px' }}>
                📥 Rooms
              </button>
              <button onClick={() => handleExport('audit')} className="action-btn" style={{ padding: '8px 20px' }}>
                📥 Audit Log
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}