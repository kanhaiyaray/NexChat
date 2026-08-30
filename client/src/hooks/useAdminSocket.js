import { useEffect, useState } from 'react';
import { getSocket } from '../services/socketClient.js';

export function useAdminSocket(clerkId) {
  const [stats, setStats] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!clerkId) return;
    
    // Reuse existing socket connection instead of creating a new one
    const socketInstance = getSocket();
    setSocket(socketInstance);

    // Only subscribe if socket is connected
    if (socketInstance.connected) {
      socketInstance.emit('admin:subscribe');
    } else {
      socketInstance.once('connect', () => {
        socketInstance.emit('admin:subscribe');
      });
    }

    const handleStats = (data) => {
      setStats(data);
    };

    const handleError = (err) => {
      console.error('Admin socket error:', err);
    };

    socketInstance.on('admin:stats', handleStats);
    socketInstance.on('admin:error', handleError);

    return () => {
      socketInstance.off('admin:stats', handleStats);
      socketInstance.off('admin:error', handleError);
      // Don't disconnect - the socket is shared
    };
  }, [clerkId]);

  return { stats, socket };
}
