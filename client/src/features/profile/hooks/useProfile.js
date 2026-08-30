import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:1000';

export const useProfile = (clerkId, username, clerkUser) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    if (!clerkId) {
      setLoading(false);
      return null;
    }

    try {
      const response = await fetch(`${API_BASE}/api/user/profile/${clerkId}?requesterId=${clerkId}`);
      
      if (response.status === 404) {
        // Try to sync/create profile
        const syncResponse = await fetch(`${API_BASE}/api/user/sync/${clerkId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            email: clerkUser?.primaryEmailAddress?.emailAddress,
            avatarUrl: clerkUser?.imageUrl
          })
        });

        if (syncResponse.ok) {
          const syncData = await syncResponse.json();
          setProfile(syncData.profile);
          return syncData.profile;
        }
        return null;
      }

      const data = await response.json();
      if (response.ok) {
        setProfile(data);
        return data;
      }
      return null;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [clerkId, username, clerkUser]);

  const updateProfile = useCallback(async (formData) => {
    if (!clerkId) return null;

    try {
      const response = await fetch(`${API_BASE}/api/user/profile/${clerkId}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Update failed');
      }

      setProfile(data.profile);
      return data.profile;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [clerkId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
  };
};

export default useProfile;
