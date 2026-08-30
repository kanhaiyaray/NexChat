import {
  saveMessage,
  deleteMessage,
  editMessage,
  addReaction,
  getMessageContext,
} from '../services/message.service.js';
import { addActivityFeedItem } from '../services/profile.service.js';
import { pinMessage, unpinMessage } from '../services/room.service.js';
import { uploadImage, uploadVoice, isCloudinaryConfigured } from '../config/cloudinary.js';
import { roomState } from '../state/roomState.js';

export const messageHandlers = (socket, io) => {
  const currentRoom = () => socket.currentRoom;
  const currentUser = () => socket.currentUser;

  return {
    send_message: async (data) => {
      const room = data.room || currentRoom();
      const sender = data.sender || currentUser();

      if (!room || !sender) {
        socket.emit('send_error', { message: 'Not in a room' });
        return;
      }

      try {
        const savedMsg = await saveMessage({
          ...data,
          room,
          sender,
          type: 'text',
        });

        if (data.clerkId) {
          await addActivityFeedItem(data.clerkId, data.message, room);
        }

        const finalMessage = {
          id: savedMsg._id.toString(),
          room: savedMsg.room,
          sender: savedMsg.sender,
          message: savedMsg.message,
          type: 'text',
          timestamp: savedMsg.timestamp.toISOString(),
          imageUrl: '',
          voiceUrl: '',
          voiceDuration: null,
          edited: savedMsg.edited || false,
          editedAt: savedMsg.editedAt || null,
          reactions: savedMsg.reactions || {},
          replyTo: savedMsg.replyTo || null,
        };

        io.to(room).emit('receive_message', finalMessage);
      } catch (err) {
        console.error('Message send error:', err.message);
        socket.emit('send_error', { message: err.message });
      }
    },

    send_image: async (data) => {
      const room = data.room || currentRoom();
      const sender = data.sender || currentUser();

      if (!room || !sender) {
        socket.emit('image_error', { message: 'Not in a room' });
        return;
      }

      if (!data.imageBase64 || !data.imageBase64.startsWith('data:image')) {
        socket.emit('image_error', { message: 'Invalid image format.' });
        return;
      }

      if (!isCloudinaryConfigured()) {
        socket.emit('image_error', { message: 'Image storage is not configured on the server.' });
        return;
      }

      try {
        const uploaded = await uploadImage(data.imageBase64);

        const savedMsg = await saveMessage({
          room,
          sender,
          imageUrl: uploaded.secure_url,
          type: 'image',
          timestamp: data.timestamp,
        });

        if (data.clerkId) {
          await addActivityFeedItem(data.clerkId, '📷 Image shared', room);
        }

        const finalMessage = {
          id: savedMsg._id.toString(),
          room,
          sender,
          imageUrl: uploaded.secure_url,
          type: 'image',
          timestamp: savedMsg.timestamp.toISOString(),
          message: '',
          voiceUrl: '',
          voiceDuration: null,
          edited: savedMsg.edited || false,
          editedAt: savedMsg.editedAt || null,
          reactions: savedMsg.reactions || {},
        };

        io.to(room).emit('receive_image', finalMessage);
      } catch (err) {
        console.error('Image upload error:', err.message);
        socket.emit('image_error', { message: 'Image upload failed. Check Cloudinary credentials.' });
      }
    },

    send_voice: async (data) => {
      const room = data.room || currentRoom();
      const sender = data.sender || currentUser();

      if (!room || !sender) {
        socket.emit('voice_error', { message: 'Not in a room' });
        return;
      }

      if (!data.audioBase64 || !data.audioBase64.startsWith('data:audio')) {
        socket.emit('voice_error', { message: 'Invalid audio format.' });
        return;
      }

      if (!isCloudinaryConfigured()) {
        socket.emit('voice_error', { message: 'Voice storage is not configured on the server.' });
        return;
      }

      try {
        const uploaded = await uploadVoice(data.audioBase64);

        const savedMsg = await saveMessage({
          room,
          sender,
          voiceUrl: uploaded.secure_url,
          voiceDuration: data.duration,
          type: 'voice',
          timestamp: data.timestamp,
        });

        if (data.clerkId) {
          await addActivityFeedItem(data.clerkId, '🎤 Voice message', room);
        }

        const finalMessage = {
          id: savedMsg._id.toString(),
          room,
          sender,
          voiceUrl: uploaded.secure_url,
          voiceDuration: data.duration,
          type: 'voice',
          timestamp: savedMsg.timestamp.toISOString(),
          message: '',
          imageUrl: '',
          edited: savedMsg.edited || false,
          editedAt: savedMsg.editedAt || null,
          reactions: savedMsg.reactions || {},
        };

        io.to(room).emit('receive_voice', finalMessage);
      } catch (err) {
        console.error('Voice upload error:', err.message);
        socket.emit('voice_error', { message: 'Voice upload failed. Please try again.' });
      }
    },

    delete_message: async ({ room, msgId, username }) => {
      const roomId = room || currentRoom();
      const user = username || currentUser();

      if (!roomId || !user) {
        socket.emit('delete_error', { message: 'Not authorized' });
        return;
      }

      try {
        const deleted = await deleteMessage(msgId, user);
        if (deleted) {
          io.to(roomId).emit('message_deleted', { msgId });
        } else {
          socket.emit('delete_error', { message: 'Message not found' });
        }
      } catch (err) {
        console.error('Delete error:', err.message);
        socket.emit('delete_error', { message: err.message });
      }
    },

    edit_message: async ({ room, msgId, newMessage, sender }) => {
      const roomId = room || currentRoom();
      const user = sender || currentUser();

      if (!roomId || !user) {
        socket.emit('edit_error', { message: 'Not authorized' });
        return;
      }

      try {
        const edited = await editMessage(msgId, newMessage, user);
        io.to(roomId).emit('message_edited', {
          msgId: edited._id.toString(),
          message: edited.message,
          edited: edited.edited,
          editedAt: edited.editedAt,
        });
      } catch (err) {
        console.error('Edit error:', err.message);
        socket.emit('edit_error', { message: err.message });
      }
    },

    message_reaction: async ({ room, msgId, emoji }) => {
      const roomId = room || currentRoom();

      if (!roomId || !msgId) return;

      try {
        await addReaction(msgId, emoji);
        io.to(roomId).emit('update_reaction', { msgId, emoji });
      } catch (err) {
        console.warn('Reaction update failed (non-fatal):', err.message);
      }
    },

    load_message_context: async ({ code, messageId }) => {
      try {
        if (!code || !messageId) {
          socket.emit('message_context_error', { message: 'Code and message id are required.' });
          return;
        }

        const actualRoom = await resolveCode(code);
        if (!actualRoom || actualRoom !== currentRoom()) {
          socket.emit('message_context_error', { message: 'You are not authorized for this room.' });
          return;
        }

        const context = await getMessageContext(actualRoom, messageId);
        if (!context) {
          socket.emit('message_context_error', { message: 'Message not found.' });
          return;
        }

        socket.emit('message_context', context);
      } catch (err) {
        console.error('Message context error:', err.message);
        socket.emit('message_context_error', { message: 'Could not load the selected message.' });
      }
    },

    pin_message: async ({ room, msgId, username }) => {
      const roomId = room || currentRoom();
      const user = username || currentUser();

      if (!roomId || !user) {
        socket.emit('pin_error', { message: 'Not authorized' });
        return;
      }

      try {
        const privateRoom = await pinMessage(roomId, msgId);
        const pinnedMsg = await Message.findById(msgId).lean();

        io.to(roomId).emit('message_pinned', {
          message: { ...pinnedMsg, id: pinnedMsg._id.toString() },
          pinnedCount: privateRoom.pinnedMessages.length
        });
      } catch (err) {
        console.error('Pin error:', err.message);
        socket.emit('pin_error', { message: err.message });
      }
    },

    unpin_message: async ({ room, msgId, username }) => {
      const roomId = room || currentRoom();
      const user = username || currentUser();

      if (!roomId || !user) {
        socket.emit('pin_error', { message: 'Not authorized' });
        return;
      }

      try {
        const privateRoom = await unpinMessage(roomId, msgId);
        io.to(roomId).emit('message_unpinned', {
          msgId,
          pinnedCount: privateRoom.pinnedMessages.length
        });
      } catch (err) {
        console.error('Unpin error:', err.message);
        socket.emit('pin_error', { message: 'Could not unpin message.' });
      }
    },

    message_read: async ({ room, msgId, username }) => {
      const roomId = room || currentRoom();
      const user = username || currentUser();

      if (!roomId || !msgId || !user) return;

      try {
        const profile = await UserProfile.findOne({ username: user });
        if (profile && profile.hideReadReceipts) {
          await ReadReceipt.findOneAndUpdate(
            { room: roomId, messageId: msgId, userId: user },
            { readAt: new Date() },
            { upsert: true }
          );
          return;
        }

        await ReadReceipt.findOneAndUpdate(
          { room: roomId, messageId: msgId, userId: user },
          { readAt: new Date() },
          { upsert: true }
        );

        const readers = await ReadReceipt.distinct('userId', { room: roomId, messageId: msgId });
        io.to(roomId).emit('receipts_updated', {
          msgId,
          readBy: readers,
          count: readers.length
        });
      } catch (err) {
        console.error('Read receipt error:', err.message);
      }
    },

    typing_start: ({ room, username }) => {
      const roomId = room || currentRoom();
      const user = username || currentUser();

      if (roomId && user) {
        socket.to(roomId).emit('user_typing', { username: user, isTyping: true });
      }
    },

    typing_stop: ({ room }) => {
      const roomId = room || currentRoom();
      const user = currentUser();

      if (roomId && user) {
        socket.to(roomId).emit('user_typing', { username: user, isTyping: false });
      }
    },
  };
};
