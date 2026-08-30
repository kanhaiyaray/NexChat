const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:1000';

export const createRoom = async (userId) => {
  const response = await fetch(`${API_BASE}/api/create-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userId || 'anonymous' }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create room');
  }

  return response.json();
};

export const validateCode = async (code) => {
  const response = await fetch(`${API_BASE}/api/validate-code/${encodeURIComponent(code)}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Invalid code');
  }

  return response.json();
};

export const searchMessages = async (code, roomId, query) => {
  const params = new URLSearchParams({ code, roomId, q: query });
  const response = await fetch(`${API_BASE}/api/search?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Search failed');
  }

  return response.json();
};

export default {
  createRoom,
  validateCode,
  searchMessages,
};
