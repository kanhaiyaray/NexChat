import { useState, useEffect, useCallback } from 'react';

export const useUnread = (room, userId) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadId, setLastReadId] = useState(null);
  const [loading, setLoading] = useState(true);
  const socket = typeof window !== 'undefined' ? window.socket : null;

  useEffect(() => {
    if (!room || !userId || !socket) {
      setLoading(false);
      return;
    }

    // Get initial unread status
    socket.emit('get_unread_status', { room, userId });

    const handleUnreadStatus = ({ unreadCount: count, lastReadId: id }) => {
      setUnreadCount(count || 0);
      setLastReadId(id);
      setLoading(false);
    };

    const handleReadStatusUpdated = ({ userId: updUserId, unreadCount: count }) => {
      if (updUserId === userId) {
        setUnreadCount(count || 0);
      }
    };

    const handleRoomMarkedRead = ({ userId: updUserId }) => {
      if (updUserId === userId) {
        setUnreadCount(0);
      }
    };

    socket.on('unread_status', handleUnreadStatus);
    socket.on('read_status_updated', handleReadStatusUpdated);
    socket.on('room_marked_read', handleRoomMarkedRead);

    // Timeout fallback
    const timeout = setTimeout(() => setLoading(false), 5000);

    return () => {
      socket.off('unread_status', handleUnreadStatus);
      socket.off('read_status_updated', handleReadStatusUpdated);
      socket.off('room_marked_read', handleRoomMarkedRead);
      clearTimeout(timeout);
    };
  }, [room, userId, socket]);

  const markAsRead = useCallback((messageId) => {
    if (!room || !userId || !socket) return;
    socket.emit('mark_read', { room, messageId, userId });
  }, [room, userId, socket]);

  const markRoomAsRead = useCallback(() => {
    if (!room || !userId || !socket) return;
    socket.emit('mark_room_read', { room, userId });
    setUnreadCount(0);
  }, [room, userId, socket]);

  return { 
    unreadCount, 
    lastReadId, 
    loading, 
    markAsRead, 
    markRoomAsRead 
  };
};

export default useUnread;
