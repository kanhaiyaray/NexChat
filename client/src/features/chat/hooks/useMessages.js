import { useState, useCallback } from 'react';

export const useMessages = (socket, roomId, username, clerkId) => {
  const [messageText, setMessageText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState('');
  const [editingDraft, setEditingDraft] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const sendMessage = useCallback(() => {
    const trimmed = messageText.trim();
    if (!trimmed || !socket) return;

    socket.emit('send_message', {
      room: roomId,
      message: trimmed,
      sender: username,
      clerkId,
      timestamp: new Date().toISOString(),
    });
    setMessageText('');
  }, [messageText, socket, roomId, username, clerkId]);

  const sendImage = useCallback((imageBase64) => {
    if (!socket) return;
    setUploading(true);
    socket.emit('send_image', {
      room: roomId,
      imageBase64,
      sender: username,
      clerkId,
      timestamp: new Date().toISOString(),
    });
  }, [socket, roomId, username, clerkId]);

  const sendVoice = useCallback((audioBase64, duration) => {
    if (!socket) return;
    setUploading(true);
    socket.emit('send_voice', {
      room: roomId,
      audioBase64,
      sender: username,
      clerkId,
      timestamp: new Date().toISOString(),
      duration,
    });
  }, [socket, roomId, username, clerkId]);

  const deleteMessage = useCallback((msgId) => {
    if (!socket) return;
    socket.emit('delete_message', { room: roomId, msgId, username });
  }, [socket, roomId, username]);

  const editMessage = useCallback((msgId, newMessage) => {
    if (!socket) return;
    setEditSaving(true);
    socket.emit('edit_message', {
      room: roomId,
      msgId,
      newMessage,
      sender: username,
    });
  }, [socket, roomId, username]);

  const addReaction = useCallback((msgId, emoji) => {
    if (!socket) return;
    socket.emit('message_reaction', { room: roomId, msgId, emoji });
  }, [socket, roomId]);

  const pinMessage = useCallback((msgId) => {
    if (!socket) return;
    socket.emit('pin_message', { room: roomId, msgId, username });
  }, [socket, roomId, username]);

  const unpinMessage = useCallback((msgId) => {
    if (!socket) return;
    socket.emit('unpin_message', { room: roomId, msgId, username });
  }, [socket, roomId, username]);

  const markAsRead = useCallback((msgId) => {
    if (!socket) return;
    socket.emit('message_read', { room: roomId, msgId, username });
  }, [socket, roomId, username]);

  const loadMessageContext = useCallback((msgId) => {
    if (!socket) return;
    socket.emit('load_message_context', { code: roomId, messageId: msgId });
  }, [socket, roomId]);

  return {
    messageText,
    setMessageText,
    editingMessageId,
    setEditingMessageId,
    editingDraft,
    setEditingDraft,
    editSaving,
    setEditSaving,
    uploading,
    setUploading,
    sendMessage,
    sendImage,
    sendVoice,
    deleteMessage,
    editMessage,
    addReaction,
    pinMessage,
    unpinMessage,
    markAsRead,
    loadMessageContext,
  };
};

export default useMessages;
