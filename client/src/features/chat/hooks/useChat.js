import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../../../services/socketClient.js';

export const useChat = (roomId, code, username, clerkId) => {
  const socket = getSocket();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reactions, setReactions] = useState({});
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [readReceipts, setReadReceipts] = useState({});

  const messageBuffer = useRef([]);
  const historyLoaded = useRef(false);

  const mergeMessages = useCallback((existing, incoming) => {
    const map = new Map(existing.map((m) => [m.id, m]));
    incoming.forEach((m) => {
      if (m?.id) map.set(m.id, { ...(map.get(m.id) || {}), ...m });
    });
    return [...map.values()].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, []);

  useEffect(() => {
    if (!roomId || !code || !username) return;

    socket.emit('join_room', { username, code, clerkId });

    const handlers = {
      chat_history: (history) => {
        setMessages(history);
        setLoading(false);
        historyLoaded.current = true;
        if (messageBuffer.current.length > 0) {
          setMessages((prev) => mergeMessages(prev, messageBuffer.current));
          messageBuffer.current = [];
        }
      },

      receive_message: (data) => {
        if (!historyLoaded.current) {
          messageBuffer.current.push(data);
          return;
        }
        setMessages((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, data]);
      },

      receive_image: (data) => {
        if (!historyLoaded.current) {
          messageBuffer.current.push(data);
          return;
        }
        setMessages((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, data]);
      },

      receive_voice: (data) => {
        if (!historyLoaded.current) {
          messageBuffer.current.push(data);
          return;
        }
        setMessages((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, data]);
      },

      update_users: (data) => setUsers(data),

      user_typing: ({ username: typingUser, isTyping }) => {
        setTyping(isTyping ? typingUser : '');
      },

      update_reaction: ({ msgId, emoji }) => {
        setReactions((prev) => {
          const current = prev[msgId] || {};
          return {
            ...prev,
            [msgId]: {
              ...current,
              [emoji]: (current[emoji] || 0) + 1,
            },
          };
        });
      },

      message_deleted: ({ msgId }) => {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
        setReactions((prev) => {
          const next = { ...prev };
          delete next[msgId];
          return next;
        });
      },

      message_edited: ({ msgId, message, edited, editedAt }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, message, edited, editedAt } : m
          )
        );
      },

      pinned_messages_list: (pinned) => setPinnedMessages(pinned),

      message_pinned: ({ message, pinnedCount }) => {
        setPinnedMessages((prev) => [message, ...prev]);
      },

      message_unpinned: ({ msgId }) => {
        setPinnedMessages((prev) => prev.filter((m) => m.id !== msgId));
      },

      receipts_updated: ({ msgId, readBy, count }) => {
        setReadReceipts((prev) => ({
          ...prev,
          [msgId]: { readBy, count },
        }));
      },

      join_error: ({ message }) => setError(message),

      // 🆕 Unread status updates
      read_status_updated: ({ userId, unreadCount }) => {
        // Handle unread count updates
        if (userId === clerkId) {
          // Update UI if needed
        }
      },
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.keys(handlers).forEach((event) => {
        socket.off(event);
      });
    };
  }, [roomId, code, username, clerkId, mergeMessages]);

  return {
    messages,
    users,
    typing,
    loading,
    error,
    reactions,
    pinnedMessages,
    readReceipts,
    socket,
    setMessages,
    setReactions,
  };
};

export default useChat;
