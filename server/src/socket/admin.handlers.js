import { fetchStats } from '../services/admin.service.js';
import { checkIsAdmin } from '../services/profile.service.js';

export const adminHandlers = (socket, io) => {
  let statsInterval = null;

  return {
    'admin:subscribe': async () => {
      const user = socket.currentUser;
      if (!user) {
        socket.emit('admin:error', { message: 'Not authenticated' });
        return;
      }

      const isAdminUser = await checkIsAdmin({ clerkId: user.clerkId });
      if (!isAdminUser) {
        socket.emit('admin:error', { message: 'Not authorized' });
        return;
      }

      if (statsInterval) {
        clearInterval(statsInterval);
      }

      statsInterval = setInterval(async () => {
        try {
          const stats = await fetchStats();
          socket.emit('admin:stats', stats);
        } catch (err) {
          // Ignore
        }
      }, 5000);

      socket.on('disconnect', () => {
        if (statsInterval) {
          clearInterval(statsInterval);
          statsInterval = null;
        }
      });
    },
  };
};
