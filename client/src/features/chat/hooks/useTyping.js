import { useState, useRef, useCallback } from 'react';

export const useTyping = (socket, roomId, username) => {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef(null);

  const handleTyping = useCallback(() => {
    if (!socket || !roomId || !username) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing_start', { room: roomId, username });
    }

    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing_stop', { room: roomId });
    }, 1200);
  }, [socket, roomId, username, isTyping]);

  return {
    isTyping,
    handleTyping,
  };
};

export default useTyping;
