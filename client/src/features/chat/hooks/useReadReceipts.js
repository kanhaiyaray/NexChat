import { useEffect, useRef } from 'react';

export const useReadReceipts = (messages, roomId, username, socket, readReceipts) => {
  const observerRef = useRef(null);

  useEffect(() => {
    if (!socket || !roomId || !username) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const msgId = entry.target.getAttribute('data-msg-id');
            if (msgId && !readReceipts[msgId]?.readBy?.includes(username)) {
              socket.emit('message_read', { room: roomId, msgId, username });
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    const msgElements = document.querySelectorAll('.msg-row');
    msgElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [messages, roomId, username, socket, readReceipts]);
};

export default useReadReceipts;
