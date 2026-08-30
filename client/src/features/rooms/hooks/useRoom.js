import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:1000';

export const useRoom = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [roomData, setRoomData] = useState(null);

  const createRoom = useCallback(async (userId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/create-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId || 'anonymous' }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Creation failed');
      }

      setRoomData(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const validateCode = useCallback(async (code) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/validate-code/${encodeURIComponent(code)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const joinRoom = useCallback(async (code) => {
    const result = await validateCode(code);
    if (result) {
      setRoomData({ code, roomId: result.roomId });
      return result;
    }
    return null;
  }, [validateCode]);

  const clearRoomData = useCallback(() => {
    setRoomData(null);
  }, []);

  return {
    loading,
    error,
    roomData,
    createRoom,
    validateCode,
    joinRoom,
    clearRoomData,
  };
};

export default useRoom;
