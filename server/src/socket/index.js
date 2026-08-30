import { roomHandlers } from './room.handlers.js';
import { messageHandlers } from './message.handlers.js';
import { adminHandlers } from './admin.handlers.js';
import { roomState } from '../state/roomState.js';
import { UserProfile } from '../models/index.js';

export const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Connected: ${socket.id}`);

    roomState.setConnection(socket.id);

    const handlers = {
      ...roomHandlers(socket, io),
      ...messageHandlers(socket, io),
      ...adminHandlers(socket, io),
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    socket.on('disconnect', () => {
      console.log(`🔴 Disconnected: ${socket.id}`);
      roomState.removeConnection(socket.id);
      const currentRoom = socket.currentRoom;
      const currentUser = socket.currentUser;
      if (currentRoom && currentUser) {
        roomState.removeUser(currentRoom, socket.id);
        io.to(currentRoom).emit('update_users', roomState.getUsers(currentRoom));
        (async () => {
          try {
            await UserProfile.findOneAndUpdate(
              { username: currentUser },
              { $set: { lastSeen: new Date() } }
            );
          } catch (err) {
            console.warn('Failed to update lastSeen on disconnect:', err.message);
          }
        })();
      }
    });
  });
};

export default { initSocket };
