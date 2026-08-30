import {
  resolveCode,
  getRoomByRoomId,
  isRoomSuspended,
} from '../services/room.service.js';
import {
  getOrCreateUserProfile,
  updateLastSeen,
} from '../services/profile.service.js';
import { roomState } from '../state/roomState.js';
import { getChatHistory } from '../services/message.service.js';

export const roomHandlers = (socket, io) => {
  return {
    join_room: async ({ username, code, clerkId }) => {
      if (!code) {
        socket.emit('join_error', {
          message: 'An invite code is required. Please use a valid invite link.',
        });
        return;
      }

      let actualRoom;
      try {
        actualRoom = await resolveCode(code);
      } catch (err) {
        console.error('Code resolution error:', err.message);
        socket.emit('join_error', { message: 'Server error. Please try again.' });
        return;
      }

      if (!actualRoom) {
        socket.emit('join_error', {
          message: 'Invalid or expired invite code. Ask the host for a new link.',
        });
        return;
      }

      const privateRoom = await getRoomByRoomId(actualRoom);
      if (privateRoom && privateRoom.suspended) {
        socket.emit('join_error', { message: 'This room has been suspended by an admin.' });
        return;
      }

      if (socket.currentRoom) {
        socket.leave(socket.currentRoom);
        roomState.removeUser(socket.currentRoom, socket.id);
        io.to(socket.currentRoom).emit('update_users', roomState.getUsers(socket.currentRoom));
      }

      socket.currentRoom = actualRoom;
      socket.currentUser = username;

      const profile = await getOrCreateUserProfile(clerkId, username, '');
      if (profile) {
        const userData = {
          username: profile.username,
          clerkId: profile.clerkId,
          displayName: profile.displayName || profile.username,
          statusEmoji: profile.statusEmoji,
          statusText: profile.statusText,
          hideOnlineStatus: profile.hideOnlineStatus,
          avatarUrl: profile.avatarUrl,
          avatarColor: profile.avatarColor,
          lastSeen: profile.lastSeen,
        };
        roomState.addUser(actualRoom, socket.id, userData);
        profile.lastSeen = new Date();
        await profile.save();
      } else {
        roomState.addUser(actualRoom, socket.id, { username, clerkId, displayName: username });
      }

      socket.join(actualRoom);
      io.to(actualRoom).emit('update_users', roomState.getUsers(actualRoom));
      socket.emit('room_joined', { roomId: actualRoom });

      try {
        const history = await getChatHistory(actualRoom);
        socket.emit('chat_history', history);
      } catch (err) {
        console.error('History fetch error:', err.message);
        socket.emit('chat_history', []);
      }
    },

    get_pinned_messages: async ({ room }) => {
      try {
        const privateRoom = await getRoomByRoomId(room);
        if (!privateRoom) {
          socket.emit('pinned_messages_list', []);
          return;
        }
        const pinned = await privateRoom.populate('pinnedMessages');
        socket.emit('pinned_messages_list', pinned.pinnedMessages.map(msg => ({
          ...msg.toObject(),
          id: msg._id.toString(),
        })));
      } catch (err) {
        console.error('Fetch pinned error:', err.message);
        socket.emit('pinned_messages_list', []);
      }
    },
  };
};
