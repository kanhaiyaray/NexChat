const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:1000';

export const getProfile = async (clerkId, requesterId) => {
  const response = await fetch(
    `${API_BASE}/api/user/profile/${clerkId}?requesterId=${requesterId || clerkId}`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }

  return response.json();
};

export const updateProfile = async (clerkId, formData) => {
  const response = await fetch(`${API_BASE}/api/user/profile/${clerkId}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update profile');
  }

  return response.json();
};

export const syncProfile = async (clerkId, data) => {
  const response = await fetch(`${API_BASE}/api/user/sync/${clerkId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sync profile');
  }

  return response.json();
};

export const batchGetProfiles = async (clerkIds) => {
  const response = await fetch(`${API_BASE}/api/user/profiles/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clerkIds }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch profiles');
  }

  return response.json();
};

export default {
  getProfile,
  updateProfile,
  syncProfile,
  batchGetProfiles,
};
