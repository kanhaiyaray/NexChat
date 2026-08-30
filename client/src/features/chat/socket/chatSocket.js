import { getSocket } from '../../../services/socketClient.js';

export const chatSocket = {
  joinRoom: (socket, { username, code, clerkId }) => {
    socket.emit('join_room', { username, code, clerkId });
  },

  sendMessage: (socket, { room, message, sender, clerkId, timestamp }) => {
    socket.emit('send_message', { room, message, sender, clerkId, timestamp });
  },

  sendImage: (socket, { room, imageBase64, sender, clerkId, timestamp }) => {
    socket.emit('send_image', { room, imageBase64, sender, clerkId, timestamp });
  },

  sendVoice: (socket, { room, audioBase64, sender, clerkId, timestamp, duration }) => {
    socket.emit('send_voice', { room, audioBase64, sender, clerkId, timestamp, duration });
  },

  deleteMessage: (socket, { room, msgId, username }) => {
    socket.emit('delete_message', { room, msgId, username });
  },

  editMessage: (socket, { room, msgId, newMessage, sender }) => {
    socket.emit('edit_message', { room, msgId, newMessage, sender });
  },

  addReaction: (socket, { room, msgId, emoji }) => {
    socket.emit('message_reaction', { room, msgId, emoji });
  },

  pinMessage: (socket, { room, msgId, username }) => {
    socket.emit('pin_message', { room, msgId, username });
  },

  unpinMessage: (socket, { room, msgId, username }) => {
    socket.emit('unpin_message', { room, msgId, username });
  },

  markAsRead: (socket, { room, msgId, username }) => {
    socket.emit('message_read', { room, msgId, username });
  },

  loadMessageContext: (socket, { code, messageId }) => {
    socket.emit('load_message_context', { code, messageId });
  },

  typingStart: (socket, { room, username }) => {
    socket.emit('typing_start', { room, username });
  },

  typingStop: (socket, { room }) => {
    socket.emit('typing_stop', { room });
  },

  getPinnedMessages: (socket, { room }) => {
    socket.emit('get_pinned_messages', { room });
  },

  subscribeAdmin: (socket) => {
    socket.emit('admin:subscribe');
  },
};

export default chatSocket;
