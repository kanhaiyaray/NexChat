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
import { Message } from '../models/index.js';
import { ReadStatus } from '../models/index.js';
import { resolveCode } from '../services/room.service.js';
import { UserProfile, ReadReceipt } from '../models/index.js';

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
          parentId: savedMsg.parentId || null,
          threadId: savedMsg.threadId || null,
          isThreadParent: savedMsg.isThreadParent || false,
          replyCount: savedMsg.replyCount || 0,
        };

        io.to(room).emit('receive_message', finalMessage);

        // Update unread counts for all users in room (except sender)
        const roomUsers = roomState.getUsers(room);
        for (const user of roomUsers) {
          if (user.username !== sender) {
            await ReadStatus.findOneAndUpdate(
              { room, userId: user.clerkId },
              { $inc: { unreadCount: 1 } },
              { upsert: true }
            );
          }
        }

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
          parentId: savedMsg.parentId || null,
          threadId: savedMsg.threadId || null,
          isThreadParent: savedMsg.isThreadParent || false,
          replyCount: savedMsg.replyCount || 0,
        };

        io.to(room).emit('receive_image', finalMessage);

        // Update unread counts
        const roomUsers = roomState.getUsers(room);
        for (const user of roomUsers) {
          if (user.username !== sender) {
            await ReadStatus.findOneAndUpdate(
              { room, userId: user.clerkId },
              { $inc: { unreadCount: 1 } },
              { upsert: true }
            );
          }
        }

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
          parentId: savedMsg.parentId || null,
          threadId: savedMsg.threadId || null,
          isThreadParent: savedMsg.isThreadParent || false,
          replyCount: savedMsg.replyCount || 0,
        };

        io.to(room).emit('receive_voice', finalMessage);

        // Update unread counts
        const roomUsers = roomState.getUsers(room);
        for (const user of roomUsers) {
          if (user.username !== sender) {
            await ReadStatus.findOneAndUpdate(
              { room, userId: user.clerkId },
              { $inc: { unreadCount: 1 } },
              { upsert: true }
            );
          }
        }

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

    // ─── UNREAD HANDLERS ──────────────────────────────────────────────────

    mark_read: async ({ room, messageId, userId }) => {
      if (!room || !messageId || !userId) {
        socket.emit('mark_read_error', { message: 'Missing required fields' });
        return;
      }

      try {
        const status = await ReadStatus.findOneAndUpdate(
          { room, userId },
          { 
            $set: { lastReadMessageId: messageId, lastReadTimestamp: new Date() },
            $addToSet: { readMessages: messageId }
          },
          { upsert: true, new: true }
        );

        // Calculate unread count
        const totalMessages = await Message.countDocuments({ room });
        const unreadCount = Math.max(0, totalMessages - status.readMessages.length);
        
        await ReadStatus.findOneAndUpdate(
          { room, userId },
          { $set: { unreadCount } }
        );

        // Broadcast updated read status to room
        io.to(room).emit('read_status_updated', { 
          userId, 
          messageId,
          unreadCount
        });

      } catch (error) {
        console.error('Mark read error:', error);
        socket.emit('mark_read_error', { message: 'Failed to mark as read' });
      }
    },

    get_unread_status: async ({ room, userId }) => {
      if (!room || !userId) {
        socket.emit('unread_status_error', { message: 'Missing required fields' });
        return;
      }

      try {
        const status = await ReadStatus.findOne({ room, userId });
        if (status) {
          socket.emit('unread_status', { 
            unreadCount: status.unreadCount || 0,
            lastReadId: status.lastReadMessageId
          });
        } else {
          // First time in room - all messages are unread
          const total = await Message.countDocuments({ room });
          socket.emit('unread_status', { 
            unreadCount: total, 
            lastReadId: null 
          });
        }
      } catch (error) {
        console.error('Get unread status error:', error);
        socket.emit('unread_status_error', { message: 'Failed to get unread status' });
      }
    },

    mark_room_read: async ({ room, userId }) => {
      if (!room || !userId) {
        socket.emit('mark_read_error', { message: 'Missing required fields' });
        return;
      }

      try {
        const lastMessage = await Message.findOne({ room })
          .sort({ timestamp: -1 });
        
        if (lastMessage) {
          await ReadStatus.findOneAndUpdate(
            { room, userId },
            { 
              $set: { 
                lastReadMessageId: lastMessage._id,
                lastReadTimestamp: new Date(),
                unreadCount: 0
              },
              $addToSet: { readMessages: lastMessage._id }
            },
            { upsert: true }
          );
        }

        io.to(room).emit('room_marked_read', { userId });
      } catch (error) {
        console.error('Mark room read error:', error);
        socket.emit('mark_read_error', { message: 'Failed to mark room as read' });
      }
    },

    // ─── THREAD HANDLERS ──────────────────────────────────────────────────

    reply_message: async ({ room, parentId, message, sender, timestamp }) => {
      const roomId = room || currentRoom();
      const user = sender || currentUser();

      if (!roomId || !user) {
        socket.emit('reply_error', { message: 'Not in a room' });
        return;
      }

      if (!parentId || !message?.trim()) {
        socket.emit('reply_error', { message: 'Invalid reply data' });
        return;
      }

      try {
        const parent = await Message.findOne({ _id: parentId, room: roomId });
        if (!parent) {
          socket.emit('reply_error', { message: 'Parent message not found' });
          return;
        }

        const reply = new Message({
          room: roomId,
          sender: user,
          message: message.trim(),
          type: 'text',
          timestamp: new Date(timestamp || Date.now()),
          parentId: parentId,
          threadId: parentId,
        });

        await reply.save();

        await Message.findByIdAndUpdate(parentId, {
          $inc: { replyCount: 1 },
          isThreadParent: true
        });

        const updatedParent = await Message.findById(parentId);

        io.to(roomId).emit('receive_reply', {
          reply: {
            id: reply._id.toString(),
            room: reply.room,
            sender: reply.sender,
            message: reply.message,
            type: reply.type,
            timestamp: reply.timestamp.toISOString(),
            parentId: reply.parentId,
            threadId: reply.threadId,
            reactions: reply.reactions || {},
            edited: false,
            editedAt: null,
          },
          parent: {
            id: updatedParent._id.toString(),
            sender: updatedParent.sender,
            message: updatedParent.message,
            snippet: updatedParent.message?.slice(0, 100),
            replyCount: updatedParent.replyCount,
          }
        });

        const threadMessages = await Message.find({ threadId: parentId })
          .sort({ timestamp: 1 })
          .lean();

        io.to(roomId).emit('thread_updated', {
          threadId: parentId,
          messages: threadMessages.map(msg => ({
            ...msg,
            id: msg._id.toString(),
          })),
        });

      } catch (error) {
        console.error('Reply error:', error);
        socket.emit('reply_error', { message: 'Failed to send reply' });
      }
    },

    load_thread: async ({ threadId }) => {
      if (!threadId) {
        socket.emit('thread_error', { message: 'Thread ID required' });
        return;
      }

      try {
        const messages = await Message.find({ threadId })
          .sort({ timestamp: 1 })
          .lean();

        const parent = await Message.findById(threadId).lean();

        socket.emit('thread_loaded', {
          threadId,
          parent: parent ? {
            ...parent,
            id: parent._id.toString(),
          } : null,
          messages: messages.map(msg => ({
            ...msg,
            id: msg._id.toString(),
          })),
        });
      } catch (error) {
        console.error('Load thread error:', error);
        socket.emit('thread_error', { message: 'Failed to load thread' });
      }
    },

    get_thread_summaries: async ({ room }) => {
      const roomId = room || currentRoom();

      if (!roomId) {
        socket.emit('thread_error', { message: 'Room required' });
        return;
      }

      try {
        const threads = await Message.find({
          room: roomId,
          isThreadParent: true,
        })
          .sort({ timestamp: -1 })
          .lean();

        socket.emit('thread_summaries', {
          threads: threads.map(thread => ({
            ...thread,
            id: thread._id.toString(),
          })),
        });
      } catch (error) {
        console.error('Thread summary error:', error);
        socket.emit('thread_error', { message: 'Failed to load threads' });
      }
    },
  };
};
